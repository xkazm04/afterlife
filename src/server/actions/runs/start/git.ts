// Git's word on a fleet repo before a run starts there, read in its own checkout: the local branches, the worktree each
// one is checked out in (`git worktree list --porcelain`, the main checkout included), and the checkout's HEAD branch.
// And the runner's own lock: a live process named by <repo>/.claude/worktrees/belay-run.pid (runner/git/worktree.ts).
// Read-only. Git runs off the event loop with a timeout; a git that fails says why, and the panel shows no branches.
import 'server-only';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { RunBranch, RunBranches } from './types';

const git = (repo: string, args: string[]) =>
  new Promise<{ ok: true; out: string } | { ok: false; reason: string }>((done) => {
    execFile('git', ['-C', repo, ...args], { timeout: 8000, windowsHide: true, maxBuffer: 8 << 20 }, (e, stdout, stderr) => {
      if (!e) return done({ ok: true, out: stdout });
      done({ ok: false, reason: `git ${args[0]} failed: ${(stderr || e.message).split(/\r?\n/)[0]?.trim() || 'no answer'}` });
    });
  });

/** `git worktree list --porcelain` -> each checked-out branch and the worktree that holds it. */
export function checkedOut(porcelain: string): Map<string, string> {
  const at = new Map<string, string>();
  for (const block of porcelain.split(/\r?\n\r?\n/)) {
    const dir = /^worktree (.+)$/m.exec(block)?.[1];
    const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1];
    if (dir && branch) at.set(branch.trim(), dir.trim());
  }
  return at;
}

/** The local branches of the checkout at `repo`, sorted, each with where it is checked out. */
export async function branchesAt(repo: string): Promise<RunBranches> {
  if (!fs.existsSync(repo)) return { ok: false, reason: `the repo path does not exist: ${repo}` };
  const [refs, trees, head] = await Promise.all([
    git(repo, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']),
    git(repo, ['worktree', 'list', '--porcelain']),
    git(repo, ['symbolic-ref', '--quiet', '--short', 'HEAD']),
  ]);
  if (!refs.ok) return refs;
  if (!trees.ok) return trees;
  const at = checkedOut(trees.out);
  const branches = refs.out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).sort().map((name): RunBranch => {
    const dir = at.get(name);
    return dir ? { name, checkedOutAt: dir } : { name };
  });
  return { ok: true, head: head.ok ? head.out.trim() || null : null, branches }; // a detached HEAD has no branch
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** The pid of a live `belay run` that holds the repo's worktrees, or null (no file, a dead pid, an unreadable file). */
export function liveRunPid(repo: string, self: number = process.pid): number | null {
  try {
    const held = Number(fs.readFileSync(path.join(repo, '.claude', 'worktrees', 'belay-run.pid'), 'utf8').trim());
    return Number.isInteger(held) && held > 0 && held !== self && alive(held) ? held : null;
  } catch {
    return null;
  }
}
