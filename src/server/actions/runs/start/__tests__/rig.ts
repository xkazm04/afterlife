// A temp git repo for the start-run tests: main (checked out), feature/free, feature/held (checked out in a worktree).
// Plus deps over it with a fake launch: nothing here can start a real run.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { branchesAt } from '../git';
import type { StartDeps } from '../plan';
import type { StartRepo } from '../types';

export interface GitRig { dir: string; repo: string; held: string; cleanup: () => void }

export function gitRig(): GitRig {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'start-run-'));
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(repo);
  const git = (...a: string[]) => execFileSync('git', ['-C', repo, ...a], { stdio: 'pipe', windowsHide: true });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
  git('add', '.');
  git('commit', '-q', '-m', 'one');
  git('branch', 'feature/free');
  git('branch', 'feature/held');
  const held = path.join(dir, 'held');
  git('worktree', 'add', '-q', held, 'feature/held');
  return { dir, repo, held, cleanup: () => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) };
}

export interface FakeDeps { deps: StartDeps; launched: { argv: string[]; cwd: string; log: string }[]; pid: { live: number | null }; now: { t: number } }

export function fakeDeps(repo: StartRepo, over: Partial<StartDeps> = {}): FakeDeps {
  const launched: FakeDeps['launched'] = [];
  const pid = { live: null as number | null };
  const now = { t: Date.parse('2026-10-25T10:00:00Z') };
  const deps: StartDeps = {
    now: () => new Date(now.t), afterlife: '/afterlife', dataDir: '/data',
    repos: () => ({ ok: true, repos: [repo] }),
    exists: (p) => fs.existsSync(p),
    branches: branchesAt,
    liveRun: () => pid.live,
    launch: async (argv, cwd, log) => {
      launched.push({ argv, cwd, log });
      return { pid: 4242 };
    },
    ...over,
  };
  return { deps, launched, pid, now };
}
