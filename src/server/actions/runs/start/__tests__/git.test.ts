// The branch read on a real temp git repo, and the runner's lock file read.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { branchesAt, checkedOut, liveRunPid } from '../git';
import { gitRig } from './rig';

const rig = gitRig();
afterAll(() => rig.cleanup());
const same = (p: string | undefined) => (p ? fs.realpathSync.native(p).toLowerCase() : p);

describe('branchesAt', () => {
  it('lists every local branch, the HEAD branch, and where each checked-out one is', async () => {
    const b = await branchesAt(rig.repo);
    if (!b.ok) throw new Error(b.reason);
    expect(b.head).toBe('main');
    expect(b.branches.map((x) => x.name)).toEqual(['feature/free', 'feature/held', 'main']);
    expect(b.branches.find((x) => x.name === 'feature/free')?.checkedOutAt).toBeUndefined();
    expect(same(b.branches.find((x) => x.name === 'feature/held')?.checkedOutAt)).toBe(same(rig.held));
    expect(same(b.branches.find((x) => x.name === 'main')?.checkedOutAt)).toBe(same(rig.repo)); // the main checkout counts
  }, 30_000);
  it('says why for a path that is no repo', async () => {
    expect(await branchesAt(path.join(rig.dir, 'nope'))).toMatchObject({ ok: false, reason: expect.stringMatching(/does not exist/) });
    expect(await branchesAt(rig.dir)).toMatchObject({ ok: false, reason: expect.stringMatching(/^git /) });
  }, 30_000);
});

describe('checkedOut', () => {
  it('reads branch blocks and skips a detached or bare one', () => {
    const porcelain = 'worktree C:/r\nHEAD 1\nbranch refs/heads/main\n\nworktree C:/w\nHEAD 2\ndetached\n\nworktree C:/x\nHEAD 3\nbranch refs/heads/a/b\n';
    expect([...checkedOut(porcelain)]).toEqual([['main', 'C:/r'], ['a/b', 'C:/x']]);
  });
});

describe('liveRunPid', () => {
  const file = path.join(rig.repo, '.claude', 'worktrees', 'belay-run.pid');
  it('is null with no file, a dead pid or this process', () => {
    expect(liveRunPid(rig.repo)).toBeNull();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '999999999\n');
    expect(liveRunPid(rig.repo)).toBeNull();
    fs.writeFileSync(file, `${process.pid}\n`);
    expect(liveRunPid(rig.repo)).toBeNull();
  });
  it('names a live pid that is not this process', () => {
    fs.writeFileSync(file, `${process.pid}\n`);
    expect(liveRunPid(rig.repo, process.pid + 1)).toBe(process.pid);
  });
});
