// Earned on gated work: the gated outputs are the counted merged outputs belay-apply's gate decided (a tier_decision event
// for the same agent, class and MR in the imported ledger), null when the poll did not read the ledger; trust-policy.yml's
// `gated: all` on Hands-off asks every accepted output to be one. The gate last seen is the latest tier_decision since the
// record's since. Migration 0011 stores both on class_tier.
import { describe, expect, it } from 'vitest';
import { NOT_RECORDED, promotion, whyNot } from '@/lib/promotion';
import { repoPolicy } from '@/server/data/policy';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { listClassTiers, upsertClassTiers } from '@/server/index/repositories/fleet/classTier';
import { countRecord, type CountedEvent, type CountedTask, type CounterSource } from '../../counters';
import { gateSeenOf } from '../../gate';

const NOW = new Date('2026-10-06T14:22:00Z');
const DAY = 86_400_000;
const SINCE = new Date(NOW.getTime() - 20 * DAY);
const AGENT = 'ai-qa-acme-lab';
const CLS = 'qa.file-bug';
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const IIDS = Array.from({ length: 15 }, (_, i) => 201 + i);

/** A merged MR with its push notes read: none edited, so no-edit is stated. */
const task = (iid: number): CountedTask =>
  ({ agent: AGENT, actionClass: CLS, state: 'merged', stateLabel: 'merged', startedAt: ago(2), finishedAt: ago(1), mrIid: iid, detail: { edited: false } });
const decision = (iid: number, days: number, over: Partial<CountedEvent> = {}): CountedEvent =>
  ({ agent: AGENT, action_class: CLS, kind: 'tier_decision', tier_at_time: 'supervised', at: ago(days).toISOString(), subject: { project_id: 1, type: 'mr', iid }, ...over });

/** 15 merged outputs; the gate decided the first `gated` of them (and some events that must not count). */
const src = (gated: number, o: Partial<CounterSource> = {}): CounterSource => ({
  tasks: IIDS.map(task),
  events: [
    ...IIDS.slice(0, gated).map((iid) => decision(iid, 1.5)),
    decision(IIDS[14] as number, 1, { agent: 'ai-qa-other' }), decision(IIDS[14] as number, 1, { action_class: 'dep-bump.patch' }),
    decision(IIDS[14] as number, 1, { kind: 'proof_verdict' }), decision(999, 1),
  ],
  revertDemotes: true,
  ledgerRead: true,
  ...o,
});
const count = (s: CounterSource) => countRecord(s, { agent: AGENT, classId: CLS, since: SINCE }, NOW);
const handsOff = (s: CounterSource) => promotion({ tier: 'supervised', ceiling: 'hands_off', record: count(s) }, 'repro', repoPolicy());

describe('gated outputs', () => {
  it('15 merged outputs, 12 with a tier_decision for their iid: gated 12', () => {
    expect(count(src(12))).toMatchObject({ accepted: 15, noEdit: 1, reverts: 0, cleanDays: 20, gated: 12 });
  });
  it('with gated: all (the repo policy) the Hands-off row is unmet, and Promote names it', () => {
    const p = handsOff(src(12));
    expect(p.kind).toBe('notyet');
    expect(p.kind === 'notyet' && p.rules.filter((r) => !r.met)).toEqual([{ name: 'gated outputs', value: '12 / 15', met: false, cells: [12, 15] }]);
    expect(whyNot(p)).toBe('gated outputs is not met (12 / 15)');
  });
  it('every accepted output gated: met, and the class is eligible', () => {
    expect(handsOff(src(15)).kind).toBe('eligible');
  });
  it('the ledger was not read this poll: not recorded (null), never 0', () => {
    expect(count(src(12, { ledgerRead: false })).gated).toBeNull();
    const p = handsOff(src(12, { ledgerRead: false }));
    expect(p.kind === 'notyet' && p.rules.find((r) => r.name === 'gated outputs')).toEqual({ name: 'gated outputs', value: NOT_RECORDED, met: false });
  });
  it('a record with no since states nothing', () => {
    expect(countRecord(src(15), { agent: AGENT, classId: CLS, since: null }, NOW).gated).toBeNull();
  });
});

describe('the gate last seen', () => {
  const h = { agent: AGENT, classId: CLS, since: SINCE };
  it('the latest tier_decision for the holder and class since the record’s since', () => {
    const events = [decision(7, 25, { tier_at_time: 'assisted' }), decision(8, 3), decision(9, 0.5, { tier_at_time: 'hands_off' }), decision(10, 0.1, { agent: 'ai-qa-other' })];
    expect(gateSeenOf(events, h)).toEqual({ iid: 9, tierAtTime: 'hands_off', at: ago(0.5).toISOString() });
  });
  it('none since the since (or none at all, or no since): null', () => {
    expect(gateSeenOf([decision(7, 25)], h)).toBeNull();
    expect(gateSeenOf([], h)).toBeNull();
    expect(gateSeenOf([decision(8, 3)], { ...h, since: null })).toBeNull();
  });
});

describe('migration 0011: class_tier stores both', () => {
  it('writes and reads the gated outputs and the gate last seen; none reads back null', async () => {
    const db = await memoryIndex();
    await db.exec(`
      insert into fleet_group (path, ord) values ('core-banking', 0);
      insert into project (id, name, group_path, state) values ('ledgerline', 'ledgerline', 'core-banking', 'watching');
      insert into trust_class (id, ord, track, ceiling) values ('qa.file-bug', 0, 7, 'hands_off'), ('code-fix.patch', 1, 1, 'supervised');
    `);
    const gateSeen = { iid: 214, tierAtTime: 'supervised' as const, at: ago(1).toISOString() };
    const base = { projectId: 'ledgerline', tier: 'supervised' as const, since: SINCE, setBy: null, leaseExpires: null, move: null };
    await upsertClassTiers(db, [
      { ...base, classId: CLS, record: { accepted: 15, needed: null, noEdit: 1, cleanDays: 20, reverts: 0, gated: 12 }, gateSeen },
      { ...base, classId: 'code-fix.patch', record: { accepted: 3, needed: null, noEdit: null, cleanDays: 2, reverts: 0, gated: null }, gateSeen: null },
    ]);
    const rows = Object.fromEntries((await listClassTiers(db, 'ledgerline')).map((r) => [r.classId, r]));
    expect([rows[CLS]?.record?.gated, rows[CLS]?.gateSeen]).toEqual([12, gateSeen]);
    expect([rows['code-fix.patch']?.record && 'gated' in rows['code-fix.patch'].record, rows['code-fix.patch']?.gateSeen]).toEqual([false, null]);
  });
});
