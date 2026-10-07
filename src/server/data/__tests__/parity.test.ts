// Demo vs live: the live source, fed by a poll of the demo GitLab on top of the seeded index, must hand every screen's
// loader exactly what the demo source hands it. Where the two may differ is listed in the last describe, and nowhere else.
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { loadLadderData } from '@/app/features/ladder/data/loadLadderData';
import { loadFleetData } from '@/app/features/fleet/data/loadFleetData';
import { loadFleetSource } from '@/app/features/fleet/data/loadFleetSource';
import { loadMaturityData } from '@/app/features/maturity/data/loadMaturityData';
import { pickNeedsYouDemo } from '@/app/features/needs-you/data/pick';
import { loadSetupData } from '@/app/features/setup/data/loadSetupData';
import { loadTasks } from '@/app/features/task/model/build/loadTasks';
import { loadTheaterData } from '@/app/features/theater/data/loadTheaterData';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { listProofsFor } from '@/server/index/repositories/work/proof';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { listClassTiers } from '@/server/index/repositories/fleet/classTier';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { demoSource } from '../demoSource';
import { replayClock } from '../live/clock';
import { liveSource } from '../live/liveSource';
import { buildSnapshot } from '../live/snapshot';
import { setDataSource } from '../select';
import type { DataSource } from '../types';

let live: DataSource;
let db: PGlite;
beforeAll(async () => {
  db = await memoryIndex();
  await seedDemo(db);
  const gl = createDemoGitLab(SEED_NOW);
  const cycle = await runPollCycle(gl.port, db, replayClock.poll(), { cfg: readPollerConfig(144060371, {}) });
  expect(cycle.projects.every((p) => p.ok)).toBe(true);
  const snap = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO);
  live = liveSource(() => snap);
}, 60_000);
afterAll(() => setDataSource(null));

/** What the loaders return, as the page would send it to the client: JSON, so `undefined` and a missing key are the same. */
const asProps = (v: unknown): unknown => JSON.parse(JSON.stringify(v)) as unknown;

/** The fixture spells "no last event" as null on six projects; the index view leaves the key out. Both draw nothing. */
const noLast = (v: unknown): unknown => {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).filter(([k, val]) => !(k === 'last' && val === null)).map(([k, val]) => [k, walk(val)]));
    return x;
  };
  return walk(v);
};

function both<T>(read: () => T): [T, T] {
  setDataSource(demoSource);
  const d = read();
  setDataSource(live);
  const l = read();
  setDataSource(null);
  return [d, l];
}

describe('every screen loader gets the same data from the live source as from the demo source', () => {
  it('Fleet: 184 projects, groups, classes, tier counts, rungs, feed ages, the deep project and the status-bar facts', () => {
    const [d, l] = both(() => asProps(loadFleetData()));
    expect(noLast(l)).toEqual(noLast(d));
  });

  it('Needs you: the five inbox items and the incident, read for the screen', () => {
    const [d, l] = both(() => asProps(pickNeedsYouDemo()));
    expect(l).toEqual(d);
  });

  it('Task: the docket, merged with the screen’s own fixtures', () => {
    const [d, l] = both(() => asProps(loadTasks()));
    expect(l).toEqual(d);
  });

  it('Ladder: classes, tiers, leases, records, last moves, the means of each tier, the poll age and the subtitle', () => {
    const [d, l] = both(() => asProps(loadLadderData()));
    expect(l).toEqual(d);
  });

  it('Maturity: the nine rungs and the gap proposals', () => {
    const [d, l] = both(() => asProps(loadMaturityData()));
    expect(l).toEqual(d);
  });

  it('Setup and Theater', () => {
    const [ds, ls] = both(() => asProps(loadSetupData()));
    expect(ls).toEqual(ds);
    const [dt, lt] = both(() => asProps(loadTheaterData()));
    expect(lt).toEqual(dt);
  });

  it('the badge number in the layout, and the deep project', () => {
    expect([live.getNeedsYouCount(), live.deepProjectId(), live.mode]).toEqual([5, 'ledgerline', 'live']);
    expect([demoSource.getNeedsYouCount(), demoSource.deepProjectId(), demoSource.mode]).toEqual([5, 'ledgerline', 'demo']);
  });
});

describe('the poll really did write what the parity rests on (it is not just the seed)', () => {
  it('ledgerline is linked to its GitLab project, its tiers come from tier-state.yml and its proof from the MR note', async () => {
    expect((await getProjectRow(db, 'ledgerline'))?.gitlabId).toBe(90010001);
    const tiers = await listClassTiers(db, 'ledgerline');
    expect(tiers.find((t) => t.classId === 'dep-bump.patch')).toMatchObject({ setBy: 'operator via promotion MR !33' });
    expect(tiers.find((t) => t.classId === 'dep-bump.patch')?.record).toMatchObject({ accepted: 16 }); // seeded: GitLab cannot restate it
    const proof = (await listProofsFor(db, ['01J8Q4'])).get('01J8Q4');
    expect(proof?.block?.task.head_sha).toBe('a41c0ffee00000000000000000000000000000a1');
  });
});

describe('where live differs from demo, on purpose', () => {
  it('the portfolio header counts what is watched now, and lists no illustrative projects', () => {
    expect(live.getPortfolio().group).toBe(demoSource.getPortfolio().group);
    expect(live.getPortfolio().asOf).toBe(demoSource.getPortfolio().asOf);
    expect(live.getPortfolio().projects).toEqual([]);
  });

  it('tracks, the loop and the cockpit text are the demo catalogue until the poller derives them', () => {
    expect(live.getTracks()).toBe(DEMO.tracks);
    expect(live.getLoop()).toBe(DEMO.loop);
    expect(live.getCockpit().running).toBe(DEMO.cockpit.running);
  });

  it('the recent events are read from the index (tasks, proofs, poll state), none of them the catalogue feed', () => {
    const events = live.getEvents();
    const feed = new Set(DEMO.events.map(([, , text]) => text));
    expect(events.filter(([, , text]) => feed.has(text))).toEqual([]);
    expect(events).toEqual([
      ['14:21', '—', 'polled · ok'],
      ['14:10', 'T4', '!44 opened · Bump ktor-client 3.1.2 → 3.1.4 · blocked'],
      ['09:29', 'T1', '!41 merged · in production · proof PASS'],
      ['09:02', 'T1', '!41 opened · Fix path traversal in statement export'],
    ]);
  });

  it('the Fleet reads the mode and the recent events beside its loader; the demo keeps its feed', () => {
    const [d, l] = both(() => asProps(loadFleetSource()));
    expect(d).toEqual({ mode: 'demo', events: DEMO.events });
    expect(l).toEqual({ mode: 'live', events: live.getEvents() });
  });
});
