import { beforeAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { getActionClasses, getFleet, getNeedsYou, getTask, getTasks } from '@/server/index/views';
import { getPairing } from '@/server/index/repositories/pairing';
import { getPollState } from '@/server/index/repositories/pollState';
import { readLedger } from '@/server/index/repositories/ledger/ledger';
import { failing, NOW, rig, type Rig } from './helpers';

const LEDGERLINE = 'ledgerline';
let r: Rig;
let first: Awaited<ReturnType<Rig['poll']>>;

beforeAll(async () => {
  r = await rig();
  first = await r.poll();
}, 60_000);

describe('poll cycle against the demo GitLab, from an empty index', () => {
  it('watches ledgerline and leaves belay-policy and belay-ledger alone', () => {
    expect(first.error ?? first.projects.map((p) => p.error)).toEqual([undefined]);
    expect(first.ok).toBe(true);
    expect(first.projects.map((p) => [p.id, p.ok, p.tasks, p.proofs, p.ledger])).toEqual([[LEDGERLINE, true, 2, 1, 'imported']]);
    expect(first.warnings).toEqual([]);
  });

  it('fleet: the project row, its group and the twelve classes in policy order', async () => {
    const fleet = await getFleet(r.db, NOW);
    expect(fleet.groups).toEqual(['core-banking']);
    expect(fleet.classes).toEqual(DEMO.fleet.classes);
    const p = fleet.projects[0];
    expect(fleet.projects).toHaveLength(1);
    expect(p).toMatchObject({ id: LEDGERLINE, name: 'ledgerline', group: 'core-banking', state: 'watching', needsYou: 1, craOpen: 0 });
    expect(p?.proofs7d).toEqual({ pass: 31, fail: 2, inconclusive: 0 });
    expect(p?.demotions7d).toBe(1);
    expect(p?.feed).toEqual({ ageSec: 0, ok: true });
    expect(p?.classTiers).toEqual(DEMO.fleet.projects.find((x) => x.id === LEDGERLINE)?.classTiers);
    expect(p?.tiers).toEqual({ hands_off: 5, supervised: 3, assisted: 1, quarantined: 1, human_only: 2 });
  });

  it('action classes: tiers, leases and the moves the policy files can tell', async () => {
    const classes = await getActionClasses(r.db, LEDGERLINE, NOW);
    const by = Object.fromEntries(classes.map((c) => [c.id, c]));
    expect(classes.map((c) => c.id)).toEqual(DEMO.fleet.classes);
    expect(by['dep-bump.patch']).toMatchObject({ track: 'T1', ceiling: 'hands_off', tier: 'hands_off', lease_days: 9, lastMove: 'promoted 5 d ago' });
    expect(by['qa.file-bug']).toMatchObject({ ceiling: 'hands_off', tier: 'supervised' });
    expect(by['patch-bump']).toMatchObject({ tier: 'quarantined', lastMove: '4 min ago · tripwire' });
    expect(by['report.submit']?.tier).toBe('human_only');
    // the record is counted from the ledger since tier-state.yml's since (!41); no-edit has no source: null, never zero
    // !41's guardrail_verdict states pass: no guardrail block in the counts
    expect(by['dep-bump.patch']?.record).toEqual({ accepted: 1, needed: null, noEdit: null, cleanDays: 5, reverts: 0, guardrailBlocks: 0 });
  });

  it('tasks: read from MR descriptions, labels, the proof note and the guardrail note', async () => {
    const t41 = await getTask(r.db, '01J8Q4', NOW);
    expect(t41).toMatchObject({
      track: 'T1', cls: 'dep-bump.patch', mr: '!41', title: 'Fix path traversal in statement export', tierAtTime: 'hands_off',
      state: 'merged · in production', agentWords: 'I normalised the requested path and rejected anything resolving outside the export root.',
    });
    expect(t41?.proof).toMatchObject({ cls: 'exploit-test', verdict: 'PASS', engine: 'proof-engine v1', digest: 'sha256:9c1e…4b07' });
    expect(t41?.proof?.checks.map((c) => [c.id, c.ok, c.ref])).toEqual(DEMO.tasks[0]?.proof?.checks.map((c) => [c.id, c.ok, c.ref]));
    const t44 = await getTask(r.db, '01J8Q9', NOW);
    expect(t44).toMatchObject({ track: 'T4', cls: 'guard.block', mr: '!44', state: 'blocked', quote: DEMO.tasks[1]?.quote, reason: DEMO.tasks[1]?.reason });
    expect(t44?.proof).toBeUndefined();
    expect((await getTasks(r.db, LEDGERLINE, NOW)).map((t) => t.id).sort()).toEqual(['01J8Q4', '01J8Q9']);
  });

  it('needs you: a tripwire quarantine opens a re-admit ask, with its reason', async () => {
    expect(await getNeedsYou(r.db, LEDGERLINE, NOW)).toEqual([{
      id: 'readmit:ledgerline:patch-bump', kind: 'readmit', title: 'Re-admit T8 gardener · patch-bump',
      reason: 'guardrail high severity on !44', does: 'Re-admits at Assisted at most, never at its old tier.',
    }]);
  });

  it('imports the ledger and records where Belay is paired', async () => {
    expect((await readLedger(r.db, 90010001)).length).toBe(7);
    expect(await getPairing(r.db, 'default')).toMatchObject({ groupPath: 'acme-lab', gitlabHost: 'gitlab.com' });
    expect((await getPollState(r.db, 'project:ledgerline'))?.lastOk?.toISOString()).toBe(NOW.toISOString());
    expect((await getPollState(r.db, 'group:144060371'))?.lastError).toBeNull();
  });

  it('is idempotent: a second cycle changes nothing a screen can see', async () => {
    const before = [await getFleet(r.db, NOW), await getTasks(r.db, LEDGERLINE, NOW), await getNeedsYou(r.db, LEDGERLINE, NOW)];
    const again = await r.poll();
    expect(again.projects[0]).toMatchObject({ ok: true, ledger: 'unchanged' });
    expect([await getFleet(r.db, NOW), await getTasks(r.db, LEDGERLINE, NOW), await getNeedsYou(r.db, LEDGERLINE, NOW)]).toEqual(before);
  });
});

describe('a failed poll looks stale, and keeps the last good time', () => {
  it('a read that throws marks the feed failed with its age growing from the last good poll', async () => {
    const x = await rig();
    await x.poll();
    const later = new Date(NOW.getTime() + 47 * 60_000);
    const res = await x.poll(later, failing(x.gl.port, 'listMergeRequests'));
    expect(res.ok).toBe(false);
    expect(res.projects[0]).toMatchObject({ ok: false, error: expect.stringContaining('502') });
    const p = (await getFleet(x.db, later)).projects[0];
    expect(p?.state).toBe('stale');
    expect(p?.feed).toMatchObject({ ageSec: 47 * 60, ok: false, error: expect.stringContaining('502') });
    // and a good poll afterwards clears it
    await x.poll(new Date(later.getTime() + 30_000));
    expect((await getFleet(x.db, later)).projects[0]).toMatchObject({ state: 'watching', feed: { ok: true } });
  }, 60_000);

  it('a failed poll writes nothing: the last good rows stay', async () => {
    const x = await rig();
    await x.poll();
    const before = await getTasks(x.db, LEDGERLINE, NOW);
    await x.poll(new Date(NOW.getTime() + 60_000), failing(x.gl.port, 'listNotes'));
    expect(await getTasks(x.db, LEDGERLINE, NOW)).toEqual(before);
  }, 60_000);

  it('a project that left the group goes stale instead of looking fine', async () => {
    const x = await rig();
    await x.poll();
    x.gl.state.projects = x.gl.state.projects.filter((p) => p.raw.name !== 'ledgerline');
    const later = new Date(NOW.getTime() + 60_000);
    await x.poll(later);
    expect((await getFleet(x.db, later)).projects[0]).toMatchObject({ state: 'stale', feed: { ok: false, error: expect.stringContaining('no longer in the group') } });
  }, 60_000);

  it('an unreachable group fails every project that was polled before', async () => {
    const x = await rig();
    await x.poll();
    const later = new Date(NOW.getTime() + 120_000);
    const res = await x.poll(later, failing(x.gl.port, 'getGroup', 'glab: 401 Unauthorized (HTTP 401)'));
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining('401'), projects: [] });
    expect((await getFleet(x.db, later)).projects[0]?.feed).toMatchObject({ ageSec: 120, ok: false, error: expect.stringContaining('group could not be read') });
  }, 60_000);
});
