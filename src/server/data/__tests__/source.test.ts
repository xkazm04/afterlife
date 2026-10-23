import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { parsePolicy } from '../../../../engine/policy/load';
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
import { rulesOf } from '../policy';
import { getDataSource, setDataSource } from '../select';
import type { PolicyRules } from '../types';
import { GitLabError } from '@/server/gitlab/errors';
import type { PairingRow } from '@/server/index/repositories/pairing';
import { recordPollError, recordPollOk } from '@/server/index/repositories/pollState';
import { CYCLE_DAYS } from '@/server/index/views/cycles/cycles';
import { setupReads, type SetupPort } from '../setup/read';

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
    expect(demoSource.illustrative).toEqual([]); // the whole app is the demo there, and says so once
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

describe("Setup's step 1 is the snapshot's pairing row", () => {
  const row: PairingRow = { id: 'default', gitlabHost: 'gitlab.com', groupPath: 'acme-lab', checkoutPath: '/work/ledgerline', pairedAt: null };
  const step1 = async (pairing: PairingRow | null) => (await setupReads(null, pairing, 'ledgerline').steps()).steps[1];

  it('done with a checkout, failed without one, failed with no row at all', async () => {
    expect(await step1(row)).toEqual({ state: 'done', text: 'paired with acme-lab on gitlab.com · checkout /work/ledgerline' });
    expect(await step1({ ...row, checkoutPath: null })).toEqual({ state: 'failed', text: 'acme-lab on gitlab.com is paired, but no checkout is recorded' });
    expect(await step1(null)).toEqual({ state: 'failed', text: 'the index has no pairing row: no poll has paired a group yet' });
  });
});

describe("Setup's step 0 and step 4 when the port fails", () => {
  const steps = async (err: Error) => {
    const port = new Proxy({}, { get: (_t, k) => (k === 'currentUser' ? () => Promise.reject(err) : () => Promise.reject(new Error('down'))) });
    const sp: SetupPort = { port: port as unknown as SetupPort['port'], groupId: 1, gitlabId: () => Promise.resolve(null) };
    return (await setupReads(sp, null, 'ledgerline').steps()).steps;
  };

  it('not signed in is failed with the status; any other failure of the login is unknown with what failed', async () => {
    expect((await steps(new GitLabError('auth', 'bad token', 'user', 401)))[0]).toEqual({ state: 'failed', text: 'glab api user → 401 · not signed in (bad token)' });
    expect((await steps(new Error('boom')))[0]).toEqual({ state: 'unknown', reason: 'glab api user failed: boom' });
  });

  it("a group listing that fails leaves the projects step unknown, naming why, not failed", async () => {
    expect((await steps(new Error('boom')))[4]).toEqual({ state: 'unknown', reason: "listing the group's projects failed: down" });
  });
});

describe("the policy's window_last", () => {
  // The poller counts over the last N outputs only for a positive integer (poller/derive/tiers.ts windowOf); the rules a screen
  // shows must name the same window, or the row reads "counted over the last 2.5 outputs" and is never met.
  const withWindow = (n: unknown): PolicyRules | null => {
    const raw = parseYaml(fs.readFileSync('policy/trust-policy.yml', 'utf8')) as { promotion: { assisted_to_supervised: Record<string, unknown> } };
    raw.promotion.assisted_to_supervised.window_last = n;
    return rulesOf(parsePolicy(raw));
  };

  it('is shown for a positive integer only; anything else is no window', () => {
    const cases: [unknown, number | null][] = [[5, 5], [1, 1], [2.5, null], [0.5, null], [0, null], [-3, null], ['5', null], [null, null]];
    expect(cases.map(([n]) => withWindow(n)?.toSupervised.windowLast)).toEqual(cases.map(([, shown]) => shown));
  });
});

describe('the poll health and the tier mark read the group the poller watches', () => {
  it('a group polled before (a mistyped BELAY_GROUP_ID) does not keep the bar failed and the tiers stale', async () => {
    const db = await memoryIndex();
    const at = new Date('2026-10-06T14:22:00Z');
    await recordPollError(db, 'group:typo', 'glab: 404 Not Found');
    await recordPollError(db, 'policy:typo', 'the group could not be read: glab: 404 Not Found');
    await recordPollOk(db, 'group:144060371', at);
    await recordPollOk(db, 'policy:144060371', at);
    const d = (await buildSnapshot(db, at, 'ledgerline', DEMO, null, '144060371')).data;
    expect([d.poll.error, d.tiersStale]).toEqual([null, null]);
    await recordPollError(db, 'policy:144060371', 'tier-state.yml is not valid YAML');
    expect((await buildSnapshot(db, at, 'ledgerline', DEMO, null, 144060371)).data.tiersStale).toEqual({ reason: 'tier-state.yml is not valid YAML', lastOk: at.toISOString() });
  });
});

describe('a deep project with no recorded cycle', () => {
  it("has the index view's empty history, its cadence included, not a copy of it", async () => {
    const snap = await buildSnapshot(await memoryIndex(), new Date('2026-10-06T14:22:00Z'), 'ledgerline', DEMO);
    expect(liveSource(() => snap, DEMO).getCycles()).toEqual({ cycles: [], today: 0, cadence: CYCLE_DAYS });
  });
});
