import { afterEach, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { upsertClassTiers } from '@/server/index/repositories/fleet/classTier';
import { upsertGroups, upsertTrustClasses } from '@/server/index/repositories/fleet/taxonomy';
import { upsertProjects } from '@/server/index/repositories/fleet/project';
import { upsertTasks } from '@/server/index/repositories/work/task';
import { readDataConfig } from '../config';
import { demoSource } from '../demoSource';
import { liveSource } from '../live/liveSource';
import { buildSnapshot } from '../live/snapshot';
import { getDataSource, setDataSource } from '../select';

afterEach(() => setDataSource(null));

describe('which source serves the request', () => {
  it('BELAY_MODE defaults to demo; only "live" is live; BELAY_GITLAB defaults to glab', () => {
    expect(readDataConfig({})).toEqual({ mode: 'demo', gitlab: 'glab', deepProject: 'ledgerline' });
    expect(readDataConfig({ BELAY_MODE: 'live', BELAY_GITLAB: 'fake', BELAY_PROJECT: 'billing' })).toEqual({ mode: 'live', gitlab: 'fake', deepProject: 'billing' });
    expect(readDataConfig({ BELAY_MODE: 'replay' }).mode).toBe('demo'); // the hosted replay serves the demo data
    expect(readDataConfig({ BELAY_MODE: 'LIVE' }).mode).toBe('demo'); // not a typo-tolerant switch
  });

  it('demo mode is the demo source, chosen per call from the environment it is given', () => {
    expect(getDataSource({})).toBe(demoSource);
    expect(getDataSource({ BELAY_MODE: 'demo' }).mode).toBe('demo');
  });

  it('live mode before the first poll throws rather than showing an empty fleet as real', () => {
    expect(() => getDataSource({ BELAY_MODE: 'live' }).getFleet()).toThrow(/first poll has not finished/);
  });

  it('a test can pin a source', () => {
    setDataSource(demoSource);
    expect(getDataSource({ BELAY_MODE: 'live' })).toBe(demoSource);
  });

  it('the demo source is exactly the demo accessors', () => {
    expect(demoSource.getFleet()).toBe(DEMO.fleet);
    expect(demoSource.getTasks()).toBe(DEMO.tasks);
    expect(demoSource.deepProjectId()).toBe('ledgerline');
  });
});

describe('a live snapshot of an index that knows little', () => {
  it('an empty index: no projects, no classes, no tasks, a maturity scan that says it never ran', async () => {
    const db = await memoryIndex();
    const live = liveSource(() => ({ at: new Date(), deep: 'ledgerline', data: undefined as never }), DEMO);
    expect(live.mode).toBe('live');
    const snap = await buildSnapshot(db, new Date('2026-10-06T14:22:00Z'), 'ledgerline', DEMO);
    const d = snap.data;
    expect(d.fleet.projects).toEqual([]);
    expect([d.actionClasses, d.tasks, d.events, d.needsYou]).toEqual([[], [], [], []]);
    expect(d.portfolio).toMatchObject({ group: 'not paired', projectsWatched: 0 });
    expect(d.setup).toMatchObject({ group: 'not paired', project: 'ledgerline' });
    expect(d.maturity.engine).toBe('not scanned');
    expect(d.maturity.rungs).toHaveLength(9);
    expect(d.maturity.rungs.every((r) => r.now === null && r.day0 === null)).toBe(true); // unknown, never absent
    expect(d.cockpit.feed.lastPollSec).toBe(0);
  });

  it('what the index cannot give is shown as the most restrictive reading, and an unclassified task is not listed', async () => {
    const db = await memoryIndex();
    await upsertGroups(db, ['g']);
    await upsertProjects(db, [{ id: 'ledgerline', gitlabId: 1, name: 'ledgerline', what: '', groupPath: 'g', state: 'watching', setupStep: null, ord: 0, armed: 0, proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null }]);
    await upsertTrustClasses(db, [{ id: 'a', ord: 0, track: 1, agent: 'patcher', ceiling: 'hands_off' }]);
    await upsertClassTiers(db, [{ projectId: 'ledgerline', classId: 'a', tier: null, since: null, setBy: null, leaseExpires: null, record: null, move: null }]);
    const task = (id: string, cls: string | null, tier: 'hands_off' | null) => ({
      id, projectId: 'ledgerline', track: null, agent: null, actionClass: cls, mrIid: null, title: id, tierAtTime: tier, state: null, stateLabel: null, startedAt: null, finishedAt: null, detail: {},
    });
    await upsertTasks(db, [task('T1', 'a', null), task('T2', null, 'hands_off')]);
    const d = (await buildSnapshot(db, new Date(), 'ledgerline', DEMO)).data;
    expect(d.actionClasses[0]).toMatchObject({ id: 'a', tier: 'quarantined' }); // unknown tier
    expect(d.tasks).toHaveLength(1);
    expect(d.tasks[0]).toMatchObject({ id: 'T1', track: 'T?', tierAtTime: 'quarantined' });
    expect(d.fleet.projects[0]?.proofs7d).toBeNull(); // unknown stays null
  });
});
