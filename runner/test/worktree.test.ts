// Worktree removal against real git, with a junction (Windows) or dir symlink (elsewhere) inside the worktree
// pointing OUTSIDE it - what a `setup` install leaves. The link goes; what it points at must survive.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addWorktree, claimOwnWorktrees, releaseOwnWorktrees, removeTree, removeWorktree, sweepStaleWorktrees, worktreeDir, worktreesRoot } from '../git/worktree';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-wt-'));
const repo = path.join(tmp, 'repo');
const sh = (...a: string[]) => spawnSync('git', a, { cwd: repo, encoding: 'utf8' }).stdout.trim();

/** A dir outside every worktree holding keep.txt: the stand-in for a shared pnpm store. */
function outside(name: string): string {
  const d = path.join(tmp, name);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'keep.txt'), 'shared');
  return d;
}
const link = (target: string, at: string) => {
  fs.mkdirSync(path.dirname(at), { recursive: true });
  fs.symlinkSync(target, at, process.platform === 'win32' ? 'junction' : 'dir');
};

beforeAll(() => {
  fs.mkdirSync(repo);
  sh('init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
  sh('add', '-A');
  sh('-c', 'user.email=t@example.com', '-c', 'user.name=T', 'commit', '-q', '-m', 'init');
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

describe('removeWorktree', () => {
  it('removes a registered worktree and its branch without emptying a junction target inside it', async () => {
    const store = outside('store-1');
    const dir = worktreeDir(repo, 'afterlife-wave-1-a');
    await addWorktree(repo, dir, 'main', 'belay/wave-1-a');
    link(store, path.join(dir, 'node_modules', '.pnpm-store'));
    fs.writeFileSync(path.join(dir, 'node_modules', 'x.js'), 'x');
    await removeWorktree(repo, dir, 'belay/wave-1-a');
    expect(fs.existsSync(dir)).toBe(false);
    expect(fs.readFileSync(path.join(store, 'keep.txt'), 'utf8')).toBe('shared');
    expect(sh('worktree', 'list')).not.toContain('afterlife-wave-1-a');
    expect(sh('branch', '--list', 'belay/wave-1-a')).toBe('');
  });

  it('refuses to delete anything outside the worktrees root', async () => {
    const store = outside('store-2');
    expect(await removeTree(repo, store)).toMatch(/refused/);
    expect(await removeTree(repo, worktreesRoot(repo))).toMatch(/refused/);
    expect(fs.existsSync(path.join(store, 'keep.txt'))).toBe(true);
  });
});

describe('sweepStaleWorktrees', () => {
  it('deletes unregistered afterlife-wave-* dirs, links unlinked not followed, and leaves live worktrees and other dirs', async () => {
    const store = outside('store-3');
    // What paypal wave 1 left: the dir is there, its .git link and its registration are gone.
    const stale = worktreeDir(repo, 'afterlife-wave-2-b');
    await addWorktree(repo, stale, 'main', 'belay/wave-2-b');
    fs.rmSync(path.join(stale, '.git'));
    link(store, path.join(stale, 'node_modules'));
    const live = worktreeDir(repo, 'afterlife-wave-3');
    await addWorktree(repo, live, 'main', 'belay/wave-3');
    const before = worktreeDir(repo, 'belay-wave-4-c'); // left by a run from before the rename: still the runner's own
    fs.mkdirSync(before, { recursive: true });
    const other = worktreeDir(repo, 'someone-elses');
    fs.mkdirSync(other, { recursive: true });

    const removed = await sweepStaleWorktrees(repo);
    expect(removed.sort()).toEqual([stale, before].sort());
    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.readFileSync(path.join(store, 'keep.txt'), 'utf8')).toBe('shared');
    expect(fs.existsSync(path.join(live, 'a.txt'))).toBe(true);
    expect(fs.existsSync(other)).toBe(true);
    expect(sh('worktree', 'list')).not.toContain('afterlife-wave-2-b');
    await removeWorktree(repo, live, 'belay/wave-3');
  });

  it('is a no-op on a repo with no worktrees dir', async () => {
    expect(await sweepStaleWorktrees(path.join(tmp, 'nowhere'))).toEqual([]);
  });
});

describe('claimOwnWorktrees', () => {
  it("removes what a stopped run left registered at the fixed paths, drops its lane branch, keeps the wave branch", async () => {
    const head = worktreeDir(repo, 'afterlife-wave-head');
    const lane = worktreeDir(repo, 'belay-wave-lane'); // its pre-rename name: a run stopped before the rename is cleared too
    await addWorktree(repo, head, 'main', 'belay/wave-7');
    await addWorktree(repo, lane, 'main', 'belay/wave-7-a');
    const mine = worktreeDir(repo, 'afterlife-wave-8-plan');
    await addWorktree(repo, mine, 'main');
    expect(await claimOwnWorktrees(repo)).toEqual([head, lane]);
    expect(sh('worktree', 'list')).not.toMatch(/(afterlife|belay)-wave-(head|lane)/);
    expect(sh('branch', '--list', 'belay/wave-7-a')).toBe('');
    expect(sh('branch', '--list', 'belay/wave-7')).toContain('belay/wave-7');
    expect(fs.existsSync(path.join(mine, 'a.txt'))).toBe(true);
    releaseOwnWorktrees(repo);
    await removeWorktree(repo, mine);
  });

  it('refuses while another live runner holds them, and ignores a dead one', async () => {
    const file = path.join(worktreesRoot(repo), 'afterlife-run.pid');
    fs.writeFileSync(file, `${process.ppid}\n`);
    await expect(claimOwnWorktrees(repo)).rejects.toThrow(/another afterlife run/);
    fs.writeFileSync(file, '999999999\n');
    await expect(claimOwnWorktrees(repo)).resolves.toEqual([]);
    releaseOwnWorktrees(repo);
    expect(fs.existsSync(file)).toBe(false);
  });
});
