// The shell's one read: what the root layout hands the chrome and what /api/shell answers, from the same function. Live,
// the count follows the snapshot it is read from, and agrees with the Needs-you screen on what it counts.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { loadNeedsYouView } from '@/app/features/needs-you/data/pick';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { demoSource } from '../demoSource';
import { replayClock } from '../live/clock';
import { liveSource } from '../live/liveSource';
import { SEEDED_ITEMS } from '../live/seeded';
import { buildSnapshot, type LiveSnapshot } from '../live/snapshot';
import { setDataSource } from '../select';
import { readShellInfo } from './read';

let S: LiveSnapshot;
beforeAll(async () => {
  const db = await memoryIndex();
  await seedDemo(db);
  await runPollCycle(createDemoGitLab(SEED_NOW).port, db, replayClock.poll(), { cfg: readPollerConfig(144060371, {}) });
  S = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO);
}, 60_000);
afterAll(() => setDataSource(null));

/** S with one more needs-you item: a copy of a demo item under `id`. */
const plus = (id: string): LiveSnapshot => ({ ...S, data: { ...S.data, needsYou: [...S.data.needsYou, { ...DEMO.needsYou[0]!, id }] } });

/** What the Needs-you screen lists from the same snapshot. */
function listed(snap: LiveSnapshot): number {
  setDataSource(liveSource(() => snap));
  const view = loadNeedsYouView();
  return view.kind === 'live' ? view.items.length : 0;
}

describe('readShellInfo', () => {
  it('carries the projects the palette lists from the same read, so a state change reaches the palette on the next shell read', () => {
    const changed = (state: 'watching' | 'stale'): LiveSnapshot => ({
      ...S,
      data: { ...S.data, fleet: { ...S.data.fleet, projects: S.data.fleet.projects.map((p, i) => (i === 0 ? { ...p, state } : p)) } },
    });
    const first = (snap: LiveSnapshot) => readShellInfo(liveSource(() => snap), { BELAY_MODE: 'live' }).projects[0]!;
    expect(first(changed('stale')).state).toBe('stale');
    expect(first(changed('watching')).state).toBe('watching');
    expect(first(changed('watching'))).toEqual({ id: S.data.fleet.projects[0]!.id, name: S.data.fleet.projects[0]!.name, group: S.data.fleet.projects[0]!.group, state: 'watching' });
  });

  it('demo: the values the root layout built inline (the five seeded decisions, the demo group, nothing illustrative)', () => {
    expect(readShellInfo(demoSource, {})).toEqual({
      needsYouCount: 5,
      data: { mode: 'demo', fakeGitlab: false, group: demoSource.getPortfolio().group, illustrative: false, poll: null },
      projects: demoSource.getFleet().projects.map((p) => ({ id: p.id, name: p.name, group: p.group, state: p.state })),
    });
  });

  it('live on the fake GitLab: the mode, the fake flag, the snapshot\'s group, and the illustrative catalogue are named', () => {
    const info = readShellInfo(liveSource(() => S), { BELAY_MODE: 'live', BELAY_GITLAB: 'fake' });
    expect(info.data).toEqual({ mode: 'live', fakeGitlab: true, group: S.data.portfolio.group, illustrative: true, poll: { ...S.data.poll, intervalSec: 30 } });
  });

  it('live: the poll’s health is the snapshot’s, with the interval the poller keeps (BELAY_POLL_SECONDS)', () => {
    expect(S.data.poll).toMatchObject({ error: null, failing: 0 });
    expect(readShellInfo(liveSource(() => S), { BELAY_POLL_SECONDS: '45' }).data.poll).toEqual({ ...S.data.poll, intervalSec: 45 });
  });

  it('live: one new decision in the snapshot is one more on the badge; a seeded one is not, as the Needs-you screen lists them', () => {
    const k = readShellInfo(liveSource(() => S), {}).needsYouCount;
    expect(k).toBe(listed(S));

    const added = plus('mr-9001-new');
    expect(readShellInfo(liveSource(() => added), {}).needsYouCount).toBe(k + 1);
    expect(listed(added)).toBe(k + 1);

    const seeded = plus([...SEEDED_ITEMS][0]!);
    expect(readShellInfo(liveSource(() => seeded), {}).needsYouCount).toBe(k);
    expect(listed(seeded)).toBe(k);
  });

  it('live before the first poll: the read throws the source\'s own reason, it never falls back to a demo shell', () => {
    const notReady = liveSource(() => {
      throw new Error('BELAY_MODE=live, but the first poll has not finished');
    });
    expect(() => readShellInfo(notReady, {})).toThrow('first poll has not finished');
  });
});
