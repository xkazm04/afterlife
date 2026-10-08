// The counters behind trust-policy.yml's guardrail_blocks and window_last: a guardrail block only from a task row that
// states it, 0 only when the ledger this poll read holds no guardrail verdict for the counts, and the counts of an
// assisted class taken over its holder's last window_last outputs.
import { describe, expect, it } from 'vitest';
import { countRecord, type CountedEvent, type CountedTask, type CounterSource } from '../counters';

const NOW = new Date('2026-10-06T14:22:00Z');
const DAY = 86_400_000;
const SINCE = new Date(NOW.getTime() - 20 * DAY);
const AGENT = 'ai-patcher-acme-lab';
const CLS = 'code-fix.patch';
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const task = (iid: number, state: CountedTask['state'], days: number, stateLabel: string | null = state): CountedTask =>
  ({ agent: AGENT, actionClass: CLS, state, stateLabel, startedAt: ago(days), finishedAt: state === 'merged' || state === 'reverted' ? ago(days) : null, mrIid: iid });
const event = (iid: number, days: number, kind: CountedEvent['kind'] = 'merged'): CountedEvent =>
  ({ agent: AGENT, action_class: CLS, kind, at: ago(days).toISOString(), subject: { project_id: 1, type: 'mr', iid } });
/** Merges of !101.. one a day, the newest `days` ago. */
const merges = (n: number, days = 1): CountedEvent[] => Array.from({ length: n }, (_, i) => event(101 + i, days + n - 1 - i));
const src = (o: Partial<CounterSource> = {}): CounterSource => ({ tasks: [], events: merges(5), revertDemotes: true, ledgerRead: true, ...o });
const count = (s: CounterSource, window: number | null = 5) => countRecord(s, { agent: AGENT, classId: CLS, since: SINCE, window }, NOW);

describe('guardrail blocks', () => {
  it('0 when the ledger this poll read holds no guardrail verdict for the counts', () => {
    expect(count(src()).guardrailBlocks).toBe(0);
  });
  it('not recorded when the ledger was not read: no verdict is not a fact then', () => {
    expect(count(src({ ledgerRead: false })).guardrailBlocks).toBeNull();
  });
  it('not recorded when a verdict in the counts is one no task row resolves (the event does not carry pass or block)', () => {
    expect(count(src({ events: [...merges(5), event(105, 1, 'guardrail_verdict')] })).guardrailBlocks).toBeNull();
  });
  it('counted from a task row that states the block, with or without the ledger', () => {
    const blocked = task(106, 'blocked', 0.5);
    expect(count(src({ tasks: [blocked], events: [...merges(5), event(106, 0.5, 'guardrail_verdict')] })).guardrailBlocks).toBe(1);
    expect(count(src({ tasks: [blocked], ledgerRead: false })).guardrailBlocks).toBe(1);
  });
  it('a failed proof is not a guardrail block', () => {
    expect(count(src({ tasks: [task(106, 'blocked', 0.5, 'proof failed')] })).guardrailBlocks).toBe(0);
  });
  it('a block before the record’s since, or outside the window, is not in the counts', () => {
    expect(count(src({ tasks: [task(90, 'blocked', 25)] })).guardrailBlocks).toBe(0);
    expect(count(src({ tasks: [task(100, 'blocked', 10)], events: [...merges(5), event(100, 10, 'guardrail_verdict')] })).guardrailBlocks).toBe(0);
    expect(count(src({ tasks: [task(100, 'blocked', 10)] }), null).guardrailBlocks).toBe(1); // no window: since since
  });
  it('a verdict on a merge request that is no output yet might be the next one: not recorded', () => {
    expect(count(src({ events: [...merges(5), event(120, 0.1, 'guardrail_verdict')] })).guardrailBlocks).toBeNull();
  });
});

describe('window_last', () => {
  it('counts the last 5 outputs: a sixth, older merge is outside', () => {
    expect(count(src({ events: merges(6) }))).toMatchObject({ accepted: 5, window: 5 });
    expect(count(src({ events: merges(6) }), null)).toMatchObject({ accepted: 6, window: null });
  });
  it('a closed or blocked merge request among the last 5 is an output that was not accepted', () => {
    expect(count(src({ tasks: [task(106, 'closed', 0.5)] })).accepted).toBe(4);
    expect(count(src({ tasks: [task(106, 'blocked', 0.5)] }))).toMatchObject({ accepted: 4, guardrailBlocks: 1 });
  });
  it('a revert in the window is counted, and is not an accepted output', () => {
    expect(count(src({ tasks: [task(105, 'reverted', 1)] }))).toMatchObject({ accepted: 4, reverts: 1, cleanDays: null });
  });
  it('a merge request still in flight is not an output yet', () => {
    expect(count(src({ tasks: [task(106, 'started', 0.5)] })).accepted).toBe(5);
  });
});
