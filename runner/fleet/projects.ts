// The saved projects the runner may work besides fleet.yml's: each <data>/projects/<slug>.yml whose `runner` block the
// onboarding wizard saved (gates, setup, frontier). It becomes a fleet entry {slug, path: root, base: the default
// branch, gates, setup, frontier}, validated by load.ts's parseRepo like any fleet.yml repo. The default branch is
// origin/HEAD as git names it in the project's root; a project whose root has none is skipped with a warning, never
// given a guessed base. A project file without a runner block is not a runner repo and is passed over in silence.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import nodePath from 'node:path';
import { parse } from 'yaml';
import { dotDirAt, envOf } from '../proc/env';

export interface ProjectReposOptions {
  /** Where projects/ lives: AFTERLIFE_DATA_DIR, else the fleet file's folder (both are the data folder by default). */
  dataDir?: string;
  /** The default branch of a root, or undefined; git's origin/HEAD unless a test fakes it. */
  baseOf?: (root: string) => string | undefined;
  warn?: (message: string) => void;
}

export interface ProjectEntry {
  entry: Record<string, unknown>;
  file: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `origin/master` -> `master`: the branch the runner bases its waves on. */
export function gitDefaultBranch(root: string): string | undefined {
  const r = spawnSync('git', ['-C', root, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], { encoding: 'utf8', windowsHide: true, timeout: 15_000 });
  const ref = r.status === 0 ? r.stdout.trim() : '';
  return ref ? ref.replace(/^origin\//, '') : undefined;
}

export function projectEntries(o: ProjectReposOptions = {}): ProjectEntry[] {
  const dir = nodePath.join(o.dataDir ?? envOf(process.env, 'DATA_DIR') ?? dotDirAt(process.cwd()), 'projects');
  if (!fs.existsSync(dir)) return [];
  const warn = o.warn ?? ((m: string) => console.warn(m));
  const baseOf = o.baseOf ?? gitDefaultBranch;
  const out: ProjectEntry[] = [];
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.yml')).sort()) {
    const file = nodePath.join(dir, name);
    const doc: unknown = parse(fs.readFileSync(file, 'utf8'));
    if (!isObj(doc) || doc.runner === undefined) continue;
    const { slug, root, runner } = doc;
    if (!isObj(runner)) throw new Error(`${file}: runner must be a mapping with gates`);
    const base = typeof root === 'string' && root ? baseOf(root) : undefined;
    if (!base) {
      warn(`runner: ${file} is skipped: no default branch (origin/HEAD) in ${String(root)}; run \`git remote set-head origin --auto\` there`);
      continue;
    }
    out.push({ file, entry: { slug, path: root, base, gates: runner.gates, ...(runner.setup !== undefined ? { setup: runner.setup } : {}), ...(runner.frontier !== undefined ? { frontier: runner.frontier } : {}) } });
  }
  return out;
}
