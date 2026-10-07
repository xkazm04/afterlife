// Re-poll on a fake live runtime: its refresh is the runtime's own (one poll cycle of the fake GitLab, then a fresh
// snapshot), counted. Never GitLab itself, and never a timer.
import { describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import { replayClock } from '@/server/data/live/clock';
import { buildSnapshot } from '@/server/data/live/snapshot';
import { GitLabError } from '@/server/gitlab/errors';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import type { GitLabPort } from '@/server/gitlab/port';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { REPOLL_GAP_MS, repollProject, type RepollRuntime } from '../repoll';

/** The fake GitLab behind a switch: once `fail` names a call, that call is refused with a 401. */
async function fakeRuntime() {
  const gl = createDemoGitLab(SEED_NOW);
  const fail = { call: null as keyof GitLabPort | null };
  const port = new Proxy(gl.port, {
    get: (t, k, r) =>
      k === fail.call ? () => Promise.reject(new GitLabError('auth', '401 Unauthorized', 'api', 401)) : Reflect.get(t, k, r),
  });
  const db = await memoryIndex();
  await seedDemo(db);
  const cfg = readPollerConfig(144060371, {});
  const rt: RepollRuntime = { last: null, snapshot: null, refresh: () => Promise.resolve() };
  const cycle = async () => {
    rt.last = await runPollCycle(port, db, replayClock.poll(), { cfg });
    rt.snapshot = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO);
  };
  await cycle(); // the runtime's first poll, before any page is served
  const refresh = vi.fn(cycle);
  rt.refresh = refresh;
  return { gl, rt, refresh, fail };
}

describe('re-poll on the live runtime', () => {
  it('runs refresh exactly once and reports the project re-polled, with its feed age from the fresh snapshot', async () => {
    const { gl, rt, refresh } = await fakeRuntime();
    expect(await repollProject(rt, 'ledgerline')).toEqual({ result: { ok: true, ageSec: 12 }, polled: true }); // the replay clock
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(gl.state.writes).toEqual([]); // a poll only reads
  });

  it('a project whose poll fails is a failure with GitLab’s reason, never "re-polled"', async () => {
    const { rt, refresh, fail } = await fakeRuntime();
    fail.call = 'listMergeRequests';
    expect(await repollProject(rt, 'ledgerline')).toEqual({ result: { ok: false, reason: '401 Unauthorized' }, polled: true });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('a group GitLab cannot read, a cycle that does not finish, or a project outside the group is a failure', async () => {
    const group = await fakeRuntime();
    group.fail.call = 'getGroup';
    expect((await repollProject(group.rt, 'ledgerline')).result).toEqual({ ok: false, reason: expect.stringContaining('401') });

    const { rt, refresh } = await fakeRuntime();
    let t = 0;
    const later = () => (t += REPOLL_GAP_MS); // each re-poll a gap after the last: this is about the answer, not the gap
    expect((await repollProject(rt, 'billing', later)).result).toEqual({ ok: false, reason: 'not in the polled group' }); // seeded, not in GitLab
    refresh.mockImplementationOnce(() => Promise.resolve()); // the runtime caught a throwing cycle: `last` did not move
    expect((await repollProject(rt, 'ledgerline', later)).result).toEqual({ ok: false, reason: 'the poll cycle did not finish' });
    refresh.mockImplementationOnce(() => Promise.reject(new Error('snapshot failed')));
    expect(await repollProject(rt, 'ledgerline', later)).toEqual({ result: { ok: false, reason: 'snapshot failed' }, polled: true });
  });

  it('polls nothing for something that is not a project id, or before the first poll', async () => {
    const { rt, refresh } = await fakeRuntime();
    for (const bad of [42, '', '../etc', 'a b', 'x'.repeat(300), null]) {
      expect(await repollProject(rt, bad)).toEqual({ result: { ok: false, reason: 'not a project id' }, polled: false });
    }
    expect(await repollProject(null, 'ledgerline')).toEqual({ result: { ok: false, reason: 'live mode has not finished its first poll' }, polled: false });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('re-poll cannot be driven to flood GitLab', () => {
  it('a re-poll within the gap of the last one runs no cycle, and says when the next one may', async () => {
    const { rt, refresh } = await fakeRuntime();
    let t = 1_000_000;
    const now = () => t;
    expect((await repollProject(rt, 'ledgerline', now)).result.ok).toBe(true);
    for (let i = 0; i < 50; i++) await repollProject(rt, 'ledgerline', now); // a page, or a script, in a loop
    expect(refresh).toHaveBeenCalledTimes(1);
    t += 4_000;
    expect(await repollProject(rt, 'ledgerline', now)).toEqual({ result: { ok: false, reason: 'the last re-poll was 4s ago: re-poll again in 6s' }, polled: false });
    t += 6_000;
    expect((await repollProject(rt, 'ledgerline', now)).result.ok).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('a failed cycle counts too: it read GitLab as much as one that passed', async () => {
    const { rt, refresh, fail } = await fakeRuntime();
    fail.call = 'listMergeRequests';
    const now = () => 5_000_000;
    expect((await repollProject(rt, 'ledgerline', now)).result.ok).toBe(false);
    expect((await repollProject(rt, 'ledgerline', now)).result).toEqual({ ok: false, reason: expect.stringContaining('re-poll again in') });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
