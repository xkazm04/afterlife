// The IO around the plan: checks the checkout is the root of a git work tree, finds the group from its origin remote,
// reads the files, prints the plan and, only with --write, writes it. It never commits, pushes or opens an MR: it
// prints those commands for the operator to run.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BOOTSTRAP_BRANCH } from '@/lib/setup/branches';
import { describePlan, planPair, type PairAction, type PairPlan } from './plan';

export interface PairIo {
  out: (s: string) => void;
  err: (s: string) => void;
  cwd: string;
  /** The Afterlife repository root, where the agent-config template lives. */
  root: string;
}

export interface PairResult {
  code: 0 | 1 | 2;
  plan?: PairPlan;
}

const git = (dir: string, args: string[]): string | null => {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

/** "https://gitlab.com/acme-lab/core-banking/ledgerline.git" or "git@gitlab.com:acme-lab/x.git" -> "acme-lab". */
export function rootNamespace(remote: string): string | null {
  const m = remote.match(/^(?:[a-z+]+:\/\/[^/]+\/|[^@\s]+@[^:\s]+:)([^/\s]+)\/.+/i);
  return m?.[1] ?? null;
}

/**
 * The first symlink (or Windows junction) between the checkout and `rel`, the file or a folder above it, as a path under
 * the checkout, or null. Git stores links, so a cloned repo could point `.gitignore` or `.gitlab` outside itself.
 */
export function linkOn(dir: string, rel: string): string | null {
  let at = dir;
  for (const part of rel.split('/')) {
    at = path.join(at, part);
    let st: fs.Stats;
    try {
      st = fs.lstatSync(at);
    } catch {
      return null; // not there: nothing below it exists either
    }
    if (st.isSymbolicLink()) return path.relative(dir, at).split(path.sep).join('/');
  }
  return null;
}

/** Each action on a linked path is refused: nothing is read or written through a link. */
function refuseLinks(p: PairPlan, dir: string): PairPlan {
  const actions = p.actions.map((a): PairAction => {
    const link = linkOn(dir, a.path);
    return link ? { path: a.path, op: 'refuse', added: [], why: `${link} is a symlink: Afterlife writes only inside the checkout, never through a link` } : a;
  });
  return { actions, paired: actions.every((a) => a.op === 'keep'), partial: actions.some((a) => a.op === 'refuse') };
}

const USAGE ='usage: afterlife pair <checkout> [--group <path>] [--pack-version 1.0.0] [--engine-ref v0.1.0] [--write]';
const VALUED = ['--group', '--pack-version', '--engine-ref'];

interface PairArgs {
  dir: string;
  flags: Map<string, string>;
  write: boolean;
}

/** One checkout, the valued flags each with a value, and --write; anything else is refused, never guessed. */
export function parsePairArgs(argv: readonly string[]): PairArgs | string {
  const flags = new Map<string, string>();
  const dirs: string[] = [];
  let write = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === '--write') write = true;
    else if (VALUED.includes(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return `${a} needs a value`;
      flags.set(a, v);
      i += 1;
    } else if (a.startsWith('--')) return `unknown option ${a}`;
    else dirs.push(a);
  }
  if (dirs.length !== 1) return dirs.length === 0 ? USAGE : `one checkout, not ${dirs.length} (${dirs.join(', ')})`;
  return { dir: dirs[0]!, flags, write };
}

export function pair(argv: readonly string[], io: PairIo): PairResult {
  const fail = (why: string): PairResult => (io.err(`afterlife pair: ${why}\n`), { code: 2 });
  const args = parsePairArgs(argv);
  if (typeof args === 'string') return fail(args);
  const { dir: dirArg, flags, write } = args;
  const dir = path.resolve(io.cwd, dirArg);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return fail(`${dirArg} is not a directory`);
  const top = git(dir, ['rev-parse', '--show-toplevel']);
  if (!top || fs.realpathSync(top) !== fs.realpathSync(dir)) return fail(`${dirArg} is not the root of a git checkout (git rev-parse --show-toplevel)`);
  const remote = git(dir, ['remote', 'get-url', 'origin']);
  const group = flags.get('--group') ?? (remote ? rootNamespace(remote) : null);
  if (!group) return fail('no group: the checkout has no origin remote on a group; pass --group <path>');

  const template = path.join(io.root, 'gitlab/examples/target-project/.gitlab/duo/agent-config.yml');
  const agentConfig = fs.readFileSync(template, 'utf8');
  const read = (p: string): string | null => {
    const abs = path.join(dir, p);
    return !linkOn(dir, p) && fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  };
  const ref = { group, packVersion: flags.get('--pack-version') ?? '1.0.0', engineRef: flags.get('--engine-ref') ?? 'v0.1.0' };
  const plan = refuseLinks(planPair(read, ref, agentConfig), dir);

  io.out(`afterlife pair ${dir} (group ${group})\n\n`);
  if (write) {
    const done: string[] = [];
    for (const a of plan.actions) {
      if (a.text === undefined) continue;
      try {
        // checked again at the write: a link made since the plan was read is refused too
        const link = linkOn(dir, a.path);
        if (link) throw new Error(`${link} became a symlink`);
        fs.mkdirSync(path.dirname(path.join(dir, a.path)), { recursive: true });
        fs.writeFileSync(path.join(dir, a.path), a.text);
      } catch (e) {
        // A write that fails part-way says which files it already wrote, so the operator can inspect or revert them.
        const why = e instanceof Error ? e.message.split('\n')[0] : String(e);
        return fail(`writing ${a.path} failed (${why}); already written: ${done.length ? done.join(', ') : 'nothing'}. Nothing was committed.`);
      }
      done.push(a.path);
    }
  }
  io.out(`${describePlan(plan, write)}\n`);
  if (write && !plan.paired) {
    io.out(['', 'written. Nothing was committed or pushed; to propose it, as you:', `  git -C ${dirArg} switch -c ${BOOTSTRAP_BRANCH}`, `  git -C ${dirArg} add -A && git -C ${dirArg} commit -m "Afterlife bootstrap"`, `  git -C ${dirArg} push -u origin ${BOOTSTRAP_BRANCH}`, `  glab mr create --source-branch ${BOOTSTRAP_BRANCH} --title "Afterlife bootstrap" --draft`, ''].join('\n'));
  }
  return { code: plan.partial ? 1 : 0, plan };
}
