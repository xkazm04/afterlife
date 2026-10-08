// The IO around the plan: checks the checkout is the root of a git work tree, finds the group from its origin remote,
// reads the files, prints the plan and, only with --write, writes it. It never commits, pushes or opens an MR: it
// prints those commands for the operator to run.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describePlan, planPair, type PairPlan } from './plan';

export interface PairIo {
  out: (s: string) => void;
  err: (s: string) => void;
  cwd: string;
  /** The Belay repository root, where the agent-config template lives. */
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

function flag(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

export function pair(argv: readonly string[], io: PairIo): PairResult {
  const fail = (why: string): PairResult => (io.err(`belay pair: ${why}\n`), { code: 2 });
  const dirArg = argv.find((a, i) => !a.startsWith('--') && !['--group', '--pack-version', '--engine-ref'].includes(argv[i - 1] ?? ''));
  if (!dirArg) return fail('usage: belay pair <checkout> [--group <path>] [--pack-version 1.0.0] [--engine-ref v0.1.0] [--write]');
  const dir = path.resolve(io.cwd, dirArg);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return fail(`${dirArg} is not a directory`);
  const top = git(dir, ['rev-parse', '--show-toplevel']);
  if (!top || fs.realpathSync(top) !== fs.realpathSync(dir)) return fail(`${dirArg} is not the root of a git checkout (git rev-parse --show-toplevel)`);
  const remote = git(dir, ['remote', 'get-url', 'origin']);
  const group = flag(argv, 'group') ?? (remote ? rootNamespace(remote) : null);
  if (!group) return fail('no group: the checkout has no origin remote on a group; pass --group <path>');

  const template = path.join(io.root, 'gitlab/examples/target-project/.gitlab/duo/agent-config.yml');
  const agentConfig = fs.readFileSync(template, 'utf8');
  const read = (p: string): string | null => {
    const abs = path.join(dir, p);
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  };
  const plan = planPair(read, { group, packVersion: flag(argv, 'pack-version') ?? '1.0.0', engineRef: flag(argv, 'engine-ref') ?? 'v0.1.0' }, agentConfig);
  const write = argv.includes('--write');

  io.out(`belay pair ${dir} (group ${group})\n\n`);
  if (write) {
    for (const a of plan.actions) {
      if (a.text === undefined) continue;
      fs.mkdirSync(path.dirname(path.join(dir, a.path)), { recursive: true });
      fs.writeFileSync(path.join(dir, a.path), a.text);
    }
  }
  io.out(`${describePlan(plan, write)}\n`);
  if (write && !plan.paired) {
    io.out(['', 'written. Nothing was committed or pushed; to propose it, as you:', `  git -C ${dirArg} switch -c belay/bootstrap`, `  git -C ${dirArg} add -A && git -C ${dirArg} commit -m "Belay bootstrap"`, `  git -C ${dirArg} push -u origin belay/bootstrap`, '  glab mr create --source-branch belay/bootstrap --title "Belay bootstrap" --draft', ''].join('\n'));
  }
  return { code: plan.partial ? 1 : 0, plan };
}
