// The start-run round trip against a temp git repo and a fake launch: every refusal before anything is spent, the
// preview's exact command, and a confirm that launches once, never twice.
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { STALE_REASON } from '../../../vitals/run';
import { clearStartRuns, confirmStartRun, previewStartRun } from '../run';
import type { StartRun } from '../types';
import { fakeDeps, gitRig } from './rig';

const rig = gitRig();
afterAll(() => rig.cleanup());
beforeEach(() => clearStartRuns());
const repo = { slug: 'grinex-portal', path: rig.repo, base: 'main' };
const run: StartRun = { kind: 'start-run', repo: 'grinex-portal', mode: 'execute', waves: 5, lanes: 4, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet', ideas: ['scan'] };

async function previewId(f: ReturnType<typeof fakeDeps>, i: StartRun): Promise<string> {
  const p = await previewStartRun(f.deps, i);
  if (p.status !== 'preview') throw new Error(p.status === 'refused' ? p.reason : p.status);
  return p.preview.previewId;
}

describe('refusals, before anything runs', () => {
  it.each([
    ['a repo the fleet does not name', { ...run, repo: 'other' }, /other is not a fleet repo/],
    ['an onto branch that does not exist', { ...run, onto: 'feature/gone' }, /feature\/gone is not a local branch/],
    ['an onto branch a worktree holds', { ...run, onto: 'feature/held' }, /feature\/held is checked out at .*held/],
    ['an onto branch the main checkout holds', { ...run, onto: 'main' }, /main is checked out at/],
  ])('%s', async (_what, i, re) => {
    const f = fakeDeps(repo);
    expect(await previewStartRun(f.deps, i)).toMatchObject({ status: 'refused', reason: expect.stringMatching(re) });
    expect(f.launched).toEqual([]);
  }, 30_000);
  it('a checkout that is not on this machine', async () => {
    const f = fakeDeps({ ...repo, path: path.join(rig.dir, 'gone') });
    expect(await previewStartRun(f.deps, run)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/checkout is not on this machine/) });
  });
  it('a live run on that repo', async () => {
    const f = fakeDeps(repo);
    f.pid.live = 777;
    expect(await previewStartRun(f.deps, run)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/a belay run \(pid 777\) is running on grinex-portal now/) });
  });
  it('a fleet that cannot be read', async () => {
    const f = fakeDeps(repo, { repos: () => ({ ok: false, reason: 'repos[0]: base must be a git ref or sha' }) });
    expect(await previewStartRun(f.deps, run)).toMatchObject({ status: 'refused', reason: 'the fleet cannot be read: repos[0]: base must be a git ref or sha' });
  });
});

describe('preview then confirm', () => {
  it('previews the exact command and what it will do; launches it once, from the checkout, logging beside the runs', async () => {
    const f = fakeDeps(repo);
    const p = await previewStartRun(f.deps, { ...run, onto: 'feature/free' });
    if (p.status !== 'preview') throw new Error(p.status);
    expect(p.preview.commands.map((c) => c.display)).toEqual(['belay run --repo grinex-portal --mode execute --onto feature/free --waves 5 --lanes 4 --lane-cap 3 --wave-cap 25 --model sonnet --ideas scan']);
    expect(p.preview).toMatchObject({ kind: 'start-run', mode: 'live', risk: 'merge', branch: 'feature/free' });
    expect(p.preview.notes?.join(' ')).toMatch(/Nothing is pushed and nothing is merged/);
    expect(f.launched).toEqual([]);
    const c = await confirmStartRun(f.deps, { ...run, onto: 'feature/free' }, p.preview.previewId);
    expect(c).toMatchObject({ status: 'done', results: [{ ok: true, made: 'pid 4242' }] });
    expect(f.launched).toEqual([{ argv: p.preview.commands[0]?.argv, cwd: '/afterlife', log: path.join('/data', 'runs', 'grinex-portal', 'launch-20261025-100000.log') }]);
    // a double click answers from the record and launches nothing again
    expect(await confirmStartRun(f.deps, { ...run, onto: 'feature/free' }, p.preview.previewId)).toEqual(c);
    expect(f.launched).toHaveLength(1);
  }, 30_000);
  it('a propose preview is low risk and names no branch', async () => {
    const f = fakeDeps(repo);
    const p = await previewStartRun(f.deps, { ...run, mode: 'propose' });
    expect(p).toMatchObject({ status: 'preview', preview: { risk: 'low', summary: 'Plans the lanes and changes nothing.' } });
    expect(p.status === 'preview' && 'branch' in p.preview).toBe(false);
  });
  it('refuses a confirm it never previewed, or previewed too long ago', async () => {
    const f = fakeDeps(repo);
    expect(await confirmStartRun(f.deps, run, 'f'.repeat(64))).toEqual({ status: 'refused', reason: STALE_REASON });
    const id = await previewId(f, run);
    f.now.t += 16 * 60_000;
    expect(await confirmStartRun(f.deps, run, id)).toEqual({ status: 'refused', reason: STALE_REASON });
    expect(f.launched).toEqual([]);
  });
  it('refuses the confirm when a run started on the repo since the preview', async () => {
    const f = fakeDeps(repo);
    const id = await previewId(f, run);
    f.pid.live = 9;
    expect(await confirmStartRun(f.deps, run, id)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/pid 9/) });
    expect(f.launched).toEqual([]);
  });
  it('answers changed, launching nothing, when the confirm names another preview', async () => {
    const f = fakeDeps(repo);
    const id = await previewId(f, run);
    const c = await confirmStartRun(f.deps, { ...run, waves: 2 }, id);
    expect(c).toMatchObject({ status: 'changed', preview: { commands: [{ display: expect.stringMatching(/--waves 2/) }] } });
    expect(f.launched).toEqual([]);
  });
  it('a launch that throws is failed, with its reason', async () => {
    const f = fakeDeps(repo, { launch: () => Promise.reject(new Error('spawn EPERM')) });
    const c = await confirmStartRun(f.deps, run, await previewId(f, run));
    expect(c).toMatchObject({ status: 'failed', results: [{ ok: false, error: 'spawn EPERM' }] });
  });
  it('a fresh preview of the same run after it started is a new start, not a repeat', async () => {
    const f = fakeDeps(repo);
    await confirmStartRun(f.deps, run, await previewId(f, run));
    await confirmStartRun(f.deps, run, await previewId(f, run));
    expect(f.launched).toHaveLength(2);
  });
});
