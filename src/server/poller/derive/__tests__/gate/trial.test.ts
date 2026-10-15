// The next rung, run as a trial: each MR whose tier_decision says the rung above would have acted alone (`would`), resolved
// against what people did with it. The Hands-off rule never sees an MR a person turned down: 15 unedited merges and 10
// gate-approved MRs people closed are eligible, though at Hands-off those 10 would have merged on their own. trust-policy's
// `trial: {min, catches}` on a step makes the trial a row. Migration 0014 stores the counter on class_tier.
import { describe, expect, it } from 'vitest';
import { explain, promotion, whyNot } from '@/lib/promotion';
import { repoPolicy } from '@/server/data/policy';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { listClassTiers, upsertClassTiers } from '@/server/index/repositories/fleet/classTier';
import { seedDemo } from '@/server/index/seed';
import type { LedgerWould } from '@/schemas/ledger';
import { countRecord, type CountedEvent, type CountedTask, type CounterSource } from '../../counters';
import { recordOf } from '../../sources';

const NOW = new Date('2026-10-06T14:22:00Z');
const DAY = 86_400_000;
const SINCE = new Date(NOW.getTime() - 20 * DAY);
const AGENT = 'ai-qa-acme-lab';
const CLS = 'qa.file-bug';
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const MERGE: LedgerWould = { tier: 'hands_off', decision: 'merge' };
const MERGED = Array.from({ length: 15 }, (_, i) => 201 + i);
const CLOSED = Array.from({ length: 10 }, (_, i) => 301 + i);

/** null: the fact is not stated. */
const merged = (iid: number, edited: boolean | null = false): CountedTask =>
  ({ agent: AGENT, actionClass: CLS, state: 'merged', stateLabel: 'merged', startedAt: ago(3), finishedAt: ago(2), mrIid: iid, detail: edited === null ? {} : { edited } });
const closed = (iid: number, by: { username: string; agent: boolean } | null = { username: 'dev-ana', agent: false }): CountedTask =>
  ({ agent: AGENT, actionClass: CLS, state: 'closed', stateLabel: 'closed', startedAt: ago(3), finishedAt: null, mrIid: iid, detail: by ? { closedBy: by } : {} });
const decision = (iid: number, would: LedgerWould | null = MERGE, over: Partial<CountedEvent> = {}): CountedEvent =>
  ({ agent: AGENT, action_class: CLS, kind: 'tier_decision', tier_at_time: 'supervised', at: ago(2.5).toISOString(), subject: { project_id: 1, type: 'mr', iid }, ...(would ? { would } : {}), ...over });

/** The scenario: 15 merged unedited outputs and 10 MRs a person closed, all of whose tier_decisions say the next rung would merge. */
const scenario = (o: Partial<CounterSource> = {}): CounterSource => ({
  tasks: [...MERGED.map((iid) => merged(iid)), ...CLOSED.map((iid) => closed(iid))],
  events: [...MERGED, ...CLOSED].map((iid) => decision(iid)),
  revertDemotes: true,
  ledgerRead: true,
  ...o,
});
const H = { agent: AGENT, classId: CLS, since: SINCE };
const count = (s: CounterSource) => countRecord(s, H, NOW);
const handsOff = (s: CounterSource, trial?: { min: number; catches: number }) => {
  const rules = repoPolicy()!;
  return promotion({ tier: 'supervised', ceiling: 'hands_off', record: count(s) }, 'repro', trial ? { ...rules, toHandsOff: { ...rules.toHandsOff, trial } } : rules, NOW);
};

describe('the next-rung trial: counted', () => {
  it('the scenario: 25 resolved, the 10 closed by a person are caught', () => {
    expect(count(scenario())).toMatchObject({ accepted: 15, noEdit: 1, reverts: 0, gated: 15, trial: { n: 25, catches: 10 } });
  });

  it('without the trial key the rule is eligible, as before; with trial {min: 15, catches: 0} it is not, and Promote names it', () => {
    const before = handsOff(scenario());
    expect(before.kind).toBe('eligible');
    expect(before.kind === 'eligible' && before.rules.map((r) => r.name)).not.toContain('next-rung trial');
    const p = handsOff(scenario(), { min: 15, catches: 0 });
    expect(p.kind).toBe('notyet');
    expect(p.kind === 'notyet' && p.rules.filter((r) => !r.met)).toEqual([{ name: 'next-rung trial', value: '25 of 15, 10 caught', met: false, cells: [15, 15] }]);
    expect(whyNot(p)).toBe('next-rung trial is not met (25 of 15, 10 caught)');
    expect(handsOff(scenario({ tasks: MERGED.map((iid) => merged(iid)) }), { min: 15, catches: 0 }).kind).toBe('eligible'); // nobody closed one
  });

  it('a catch: edited before it merged, closed by a person, reverted; an agreement: merged with no edit', () => {
    const tasks = [merged(1, false), merged(2, true), closed(3), { ...merged(4), state: 'reverted' as const }];
    expect(count({ ...scenario(), tasks, events: [1, 2, 3, 4].map((iid) => decision(iid)) }).trial).toEqual({ n: 4, catches: 3 });
  });

  it('unresolved and left out: still open, merged with no edit fact, closed by the agent, closed by whom not read', () => {
    const tasks = [merged(1, null), closed(2, { username: AGENT, agent: true }), closed(3, null)];
    const s = { ...scenario(), tasks, events: [1, 2, 3, 4].map((iid) => decision(iid)) }; // !4: no task (still open)
    expect(count(s).trial).toEqual({ n: 0, catches: 0 });
    expect(recordOf(s, H, NOW).sources?.trial?.map((x) => [x.iid, x.resolution]).sort()).toEqual([[1, 'no_edit_fact'], [2, 'closed_by_agent'], [3, 'closer_unknown'], [4, 'open']]);
  });

  it('only a would that acts alone, of this holder and class, since the record: a wait, another agent, an older decision are no trial', () => {
    const events = [
      decision(1, { tier: 'hands_off', decision: 'wait' }), decision(2, null), decision(3, MERGE, { agent: 'ai-qa-other' }),
      decision(4, MERGE, { action_class: 'dep-bump.patch' }), decision(5, MERGE, { at: ago(30).toISOString() }), decision(6, MERGE, { kind: 'proof_verdict' }),
      decision(7, { tier: 'supervised', decision: 'approve' }, { tier_at_time: 'assisted' }), // an Assisted holder's: approve at supervised acts alone
    ];
    const s = { ...scenario(), tasks: [1, 2, 3, 4, 5, 6, 7].map((iid) => merged(iid)), events };
    expect(count(s).trial).toEqual({ n: 1, catches: 0 });
    expect(recordOf(s, H, NOW).sources?.trial).toEqual([{ iid: 7, tier: 'supervised', at: ago(2.5).toISOString(), resolution: 'agreed' }]);
  });

  it('null when the ledger was not read, and the row then is not recorded (never met)', () => {
    expect(count(scenario({ ledgerRead: false })).trial).toBeNull();
    const p = handsOff(scenario({ ledgerRead: false }), { min: 1, catches: 0 });
    expect(p.kind === 'notyet' && p.rules.find((r) => r.name === 'next-rung trial')).toEqual({ name: 'next-rung trial', value: 'not recorded', met: false });
    expect(recordOf(scenario({ ledgerRead: false }), H, NOW).sources?.trial).toBeUndefined();
  });
});

describe('the next-rung trial: listed and stored', () => {
  it("the sources list each trial MR with its resolution, and explain('trial') totals exactly the count", () => {
    const { counters, sources } = recordOf(scenario(), H, NOW);
    const x = explain('trial', sources!);
    expect(x.counted).toHaveLength(counters.trial!.n);
    expect(x.counted.filter((l) => /caught/.test(l.text)).map((l) => l.iid).sort()).toEqual(CLOSED);
    expect(x.counted.find((l) => l.iid === 201)?.text).toMatch(/^Hands-off would have merged; merged without edits: agreed · /);
    expect(x.excluded).toEqual([]);
  });

  it('migration 0014 stores {n, catches} on class_tier; null reads back as not recorded', async () => {
    const db = await memoryIndex();
    await seedDemo(db);
    const { counters, sources } = recordOf(scenario(), H, NOW);
    const row = { record: counters, sources };
    const before = (await listClassTiers(db, 'ledgerline')).find((r) => r.classId === CLS);
    await upsertClassTiers(db, [{ ...before!, ...row }]);
    const [stored] = (await listClassTiers(db, 'ledgerline')).filter((r) => r.classId === CLS);
    expect(stored?.record?.trial).toEqual({ n: 25, catches: 10 });
    expect(stored?.sources?.trial).toHaveLength(25);
    await upsertClassTiers(db, [{ ...before!, ...row, record: { ...counters, trial: null } }]);
    const [unread] = (await listClassTiers(db, 'ledgerline')).filter((r) => r.classId === CLS);
    expect('trial' in (unread?.record ?? {})).toBe(false);
  });
});
