// A class's counters come only from what a task row or a ledger event states, counted from its record's since; one that
// nothing states is null, and Ladder's own rule (promotion()) never counts a null as met.
import { describe, expect, it } from 'vitest';
import { repoPolicy } from '@/server/data/policy';
import type { ClassTierRow } from '@/server/index/repositories/fleet/classTier';
import { countRecord, type CountedEvent, type CountedTask, type CounterSource } from '../counters';
import { eligibleOf } from '../promotion';

const NOW = new Date('2026-10-06T14:22:00Z');
const DAY = 86_400_000;
const SINCE = new Date(NOW.getTime() - 10 * DAY);
const AGENT = 'ai-patcher-acme-lab';
const CLS = 'code-fix.patch';
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const task = (iid: number, state: CountedTask['state'], days: number, over: Partial<CountedTask> = {}): CountedTask =>
  ({ agent: AGENT, actionClass: CLS, state, stateLabel: state, startedAt: ago(days + 1), finishedAt: ago(days), mrIid: iid, ...over });
const merged = (iid: number, days: number, over: Partial<CountedEvent> = {}): CountedEvent =>
  ({ agent: AGENT, action_class: CLS, kind: 'merged', at: ago(days).toISOString(), subject: { project_id: 1, type: 'mr', iid }, ...over });

/** Five merged MRs: three from the ledger, two from task rows (one also in the ledger, counted once). */
const five = (): CounterSource => ({
  tasks: [task(104, 'merged', 2), task(105, 'merged', 1)],
  events: [merged(101, 6), merged(102, 5), merged(103, 4), merged(104, 2)],
  revertDemotes: true,
  ledgerRead: true,
});

const rules = repoPolicy();
const row = (tier: ClassTierRow['tier']): ClassTierRow =>
  ({ projectId: 'ledgerline', classId: CLS, tier, since: SINCE, setBy: 'start tier + record', leaseExpires: null, record: null, move: null });
const eligible = (src: CounterSource, tier: ClassTierRow['tier'] = 'assisted') =>
  eligibleOf({ row: row(tier), record: countRecord(src, { agent: AGENT, classId: CLS, since: SINCE, window: tier === 'assisted' ? 5 : null }, NOW), role: 'patcher', track: 1, ceiling: 'hands_off', proof: 'exploit-test' }, rules);

describe('counters from tasks and the ledger', () => {
  it('counts merged MRs since the record, once each; no-edit stays null: merges known from the ledger alone state no edit', () => {
    expect(countRecord(five(), { agent: AGENT, classId: CLS, since: SINCE }, NOW)).toEqual({ accepted: 5, needed: null, noEdit: null, cleanDays: 10, reverts: 0, guardrailBlocks: 0, window: null });
  });

  it('counts nothing before since, of another agent or class, or that is not a merge', () => {
    const src = five();
    src.events = [...src.events, merged(90, 11), merged(91, 1, { agent: 'ai-patcher-other' }), merged(92, 1, { action_class: 'dep-bump.patch' }), merged(93, 1, { kind: 'proof_verdict' })];
    src.tasks = [...src.tasks, task(94, 'merged', 12), task(95, 'blocked', 1), task(96, 'closed', 1)];
    expect(countRecord(src, { agent: AGENT, classId: CLS, since: SINCE }, NOW).accepted).toBe(5);
  });

  it('a record with no since counts nothing: every counter null', () => {
    expect(countRecord(five(), { agent: AGENT, classId: CLS, since: null }, NOW)).toEqual({ accepted: null, needed: null, noEdit: null, cleanDays: null, reverts: null, guardrailBlocks: null, window: null });
  });
});

describe('eligibility is Ladder\'s rule on those counters', () => {
  it('an assisted class with 5 merged MRs, no revert and no guardrail block is eligible for supervised', () => {
    expect(eligible(five())).toEqual({
      classId: CLS, title: 'Promote T1 patcher · code-fix.patch', from: 'assisted', to: 'supervised',
      rules: [
        { name: 'accepted outputs', value: '5 / 5', met: true, cells: [5, 5] }, { name: 'reverts', value: '0', met: true },
        { name: 'guardrail blocks', value: '0', met: true }, { name: 'counted over the last 5 outputs', value: 'last 5', met: true },
      ],
    });
  });

  it('one revert makes it not eligible (and a reverted MR is not an accepted output)', () => {
    const src = five();
    src.tasks = [...src.tasks, task(106, 'merged', 1), task(103, 'reverted', 4)];
    expect(countRecord(src, { agent: AGENT, classId: CLS, since: SINCE }, NOW)).toMatchObject({ accepted: 5, reverts: 1, cleanDays: null });
    expect(eligible(src)).toBeNull();
  });

  it('a policy that does not demote on a revert leaves reverts with no source: null, not met', () => {
    const src = { ...five(), revertDemotes: false };
    expect(countRecord(src, { agent: AGENT, classId: CLS, since: SINCE }, NOW)).toMatchObject({ reverts: null, cleanDays: null });
    expect(eligible(src)).toBeNull();
  });

  it('a supervised class is never eligible for hands-off: merged without edits is not recorded', () => {
    const src = five();
    src.events = Array.from({ length: 20 }, (_, i) => merged(200 + i, 1));
    expect(eligible(src, 'supervised')).toBeNull();
  });
});
