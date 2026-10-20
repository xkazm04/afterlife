// Worktrees are the runner's only way into a fleet repo: every call works in a throwaway checkout under
// <repo>/.claude/worktrees, so the repo's checked-out branch and working tree are never touched. No force,
// no push. Lane branches (belay/wave-<n>-<lane>) are the runner's own and die with their worktree; the
// wave branch (belay/wave-<n>) is what a person reviews and merges.
//
// Removal never lets git delete the files: `git worktree remove --force` (git 2.43 for Windows) FOLLOWS a
// junction inside the worktree and empties its target - a pnpm store, a main checkout's node_modules - and
// when it fails partway it leaves an unregistered dir behind. The runner deletes the dir itself with fs.rm,
// which unlinks a junction or symlink instead of entering it, then lets git prune its record.
import fs from 'node:fs';
import path from 'node:path';
import { git, runProc } from '../proc/proc';

export const worktreesRoot = (repoPath: string): string => path.join(repoPath, '.claude', 'worktrees');
export const worktreeDir = (repoPath: string, name: string): string => path.join(worktreesRoot(repoPath), name);

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

/** A path as one comparable string: resolved, real when it exists, case-folded on Windows. */
function samePathKey(p: string): string {
  let r = path.resolve(p);
  try {
    r = fs.realpathSync.native(r);
  } catch {
    /* gone: compare as given */
  }
  return process.platform === 'win32' ? r.toLowerCase() : r;
}

/**
 * Deletes a dir under <repo>/.claude/worktrees without following any junction or symlink in it (fs.rm unlinks
 * links; `rmdir /s /q` is the Windows fallback, which does not follow them either). Returns null when the dir
 * is gone, else why not. Refuses any path outside the worktrees root.
 */
export async function removeTree(repoPath: string, dir: string): Promise<string | null> {
  const rel = path.relative(path.resolve(worktreesRoot(repoPath)), path.resolve(dir));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return `refused: ${dir} is not under ${worktreesRoot(repoPath)}`;
  let why = 'still there';
  try {
    await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch (e) {
    why = e instanceof Error ? e.message : String(e);
  }
  if (fs.existsSync(dir) && process.platform === 'win32') await runProc('cmd', ['/c', 'rmdir', '/s', '/q', dir]);
  return fs.existsSync(dir) ? why : null;
}

/** The worktree paths git has registered for this repo, as samePathKey keys. */
async function registered(repoPath: string): Promise<Set<string>> {
  const r = await runProc('git', ['-C', repoPath, 'worktree', 'list', '--porcelain']);
  return new Set(r.stdout.split(/\r?\n/).filter((l) => l.startsWith('worktree ')).map((l) => samePathKey(l.slice('worktree '.length))));
}

/** Removes the checkout and, when given, a branch that was only ever this worktree's. Never throws; a failure is printed. */
export async function removeWorktree(repoPath: string, dir: string, dropBranch?: string): Promise<void> {
  const left = await removeTree(repoPath, dir);
  await runProc('git', ['-C', repoPath, 'worktree', 'prune']);
  // The dir is gone but git still lists it (a locked entry): only now may git remove it, with nothing left to follow.
  if (left === null && (await registered(repoPath)).has(samePathKey(dir))) await runProc('git', ['-C', repoPath, 'worktree', 'remove', '--force', dir]);
  if (left !== null) console.error(`runner: could not remove worktree ${dir}: ${left}`);
  if (dropBranch) await runProc('git', ['-C', repoPath, 'branch', '-D', dropBranch]);
}

/**
 * Deletes every `belay-wave-*` dir under the worktrees root that git no longer lists as a worktree: what an
 * interrupted run or a half-failed removal left behind. Live worktrees are registered and never touched.
 * Returns the dirs removed; a dir that would not go is printed and left.
 */
export async function sweepStaleWorktrees(repoPath: string): Promise<string[]> {
  const root = worktreesRoot(repoPath);
  if (!fs.existsSync(root)) return [];
  await runProc('git', ['-C', repoPath, 'worktree', 'prune']);
  const live = await registered(repoPath);
  const removed: string[] = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory() || !e.name.startsWith('belay-wave-')) continue;
    const dir = path.join(root, e.name);
    if (live.has(samePathKey(dir))) continue;
    const left = await removeTree(repoPath, dir);
    if (left === null) removed.push(dir);
    else console.error(`runner: could not remove stale worktree dir ${dir}: ${left}`);
  }
  return removed;
}
