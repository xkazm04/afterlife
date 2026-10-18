// Worktrees are the runner's only way into a fleet repo: every call works in a throwaway checkout under
// <repo>/.claude/worktrees, so the repo's checked-out branch and working tree are never touched. No force,
// no push. Lane branches (belay/wave-<n>-<lane>) are the runner's own and die with their worktree; the
// wave branch (belay/wave-<n>) is what a person reviews and merges.
import path from 'node:path';
import { git, runProc } from '../proc/proc';

export const worktreeDir = (repoPath: string, name: string): string => path.join(repoPath, '.claude', 'worktrees', name);

export async function branchExists(repoPath: string, branch: string): Promise<boolean> {
  const r = await runProc('git', ['-C', repoPath, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  return r.code === 0;
}

export const resolveRef = (repoPath: string, ref: string): Promise<string> => git(repoPath, ['rev-parse', '--verify', `${ref}^{commit}`]);

/** A worktree on a NEW branch at `start`, or detached at `start` when no branch is given. */
export async function addWorktree(repoPath: string, dir: string, start: string, branch?: string): Promise<void> {
  const args = branch ? ['worktree', 'add', '-b', branch, dir, start] : ['worktree', 'add', '--detach', dir, start];
  await git(repoPath, args);
}

/** Removes the checkout and, when given, a branch that was only ever this worktree's. Never throws. */
export async function removeWorktree(repoPath: string, dir: string, dropBranch?: string): Promise<void> {
  await runProc('git', ['-C', repoPath, 'worktree', 'remove', '--force', dir]);
  await runProc('git', ['-C', repoPath, 'worktree', 'prune']);
  if (dropBranch) await runProc('git', ['-C', repoPath, 'branch', '-D', dropBranch]);
}
