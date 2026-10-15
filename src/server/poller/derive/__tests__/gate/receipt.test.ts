// receiptOf: which tier decisions read a record's commit (its own or a later one of the list), never one whose revision
// is not in the list, and the alarm against the record's tier capped by the ceiling.
import { describe, expect, it } from 'vitest';
import type { GlCommit } from '@/server/gitlab/types';
import { receiptOf, type ReceiptEvent, type ReceiptInput } from '../../receipt';

const c = (n: number): GlCommit => ({ id: String(n).repeat(40).slice(0, 40), title: `c${n}`, committedAt: `2026-10-15T10:0${n}:00.000Z` });
// newest first: c3 is the head, c2 wrote the record, c1 is older
const COMMITS = [c(3), c(2), c(1)];
const decision = (iid: number, rev: string | undefined, o: Partial<ReceiptEvent> = {}): ReceiptEvent => ({
  agent: 'ai-patcher', action_class: 'dep-bump.patch', kind: 'tier_decision', at: `2026-10-15T10:05:${String(iid).padStart(2, '0')}.000Z`,
  subject: { project_id: 1, type: 'mr', iid }, tier_at_time: 'supervised', ...(rev ? { state_rev: rev } : {}), ...o,
});
const input = (events: ReceiptEvent[], o: Partial<ReceiptInput> = {}): ReceiptInput => ({
  agent: 'ai-patcher', classId: 'dep-bump.patch', tier: 'supervised', ceiling: 'hands_off', commits: COMMITS, writer: c(2), events, ...o,
});

describe('receiptOf', () => {
  it('is null when the writer is unknown or not in the list', () => {
    expect(receiptOf(input([], { writer: null }))).toBeNull();
    expect(receiptOf(input([], { writer: c(7) }))).toBeNull();
  });

  it('reads the first decision that states the writer or a newer commit; an older, an unknown or no revision is not a read', () => {
    const events = [decision(10, c(1).id), decision(11, 'f'.repeat(40)), decision(12, undefined), decision(13, c(3).id), decision(14, c(2).id)];
    expect(receiptOf(input(events))).toEqual({
      commit: c(2).id, committedAt: c(2).committedAt, readIid: 13, readAt: '2026-10-15T10:05:13.000Z', delaySec: 193, withdrew: [], alarm: null,
    });
  });

  it('only the holder and the class: another agent or class is not a read', () => {
    expect(receiptOf(input([decision(20, c(2).id, { agent: 'someone' }), decision(21, c(2).id, { action_class: 'other' }), decision(22, c(2).id, { kind: 'guardrail_verdict' })]))?.readIid).toBeNull();
  });

  it('collects every withdrawal of a read, oldest first, and none of a decision that read an older revision', () => {
    const events = [decision(30, c(1).id, { withdrew: ['auto_merge'] }), decision(31, c(2).id, { withdrew: ['approval'] }), decision(32, c(3).id, { withdrew: ['approval', 'auto_merge'] })];
    expect(receiptOf(input(events))?.withdrew.map((w) => [w.what, w.iid])).toEqual([['approval', 31], ['approval', 32], ['auto_merge', 32]]);
  });

  it('raises the alarm on a read above the record, capped by the ceiling; not on one at or below it, nor on an older revision', () => {
    expect(receiptOf(input([decision(40, c(1).id, { tier_at_time: 'hands_off' }), decision(41, c(2).id)]))?.alarm).toBeNull();
    expect(receiptOf(input([decision(42, c(2).id), decision(43, c(3).id, { tier_at_time: 'hands_off' })]))?.alarm).toMatchObject({ iid: 43, tier: 'hands_off' });
    // a record of hands_off under a supervised ceiling: the gate grants supervised at most
    const capped = input([decision(44, c(2).id, { tier_at_time: 'hands_off' })], { tier: 'hands_off', ceiling: 'supervised' });
    expect(receiptOf(capped)?.alarm).toMatchObject({ iid: 44 });
    expect(receiptOf(input([decision(45, c(2).id, { tier_at_time: 'hands_off' })], { tier: 'hands_off' }))?.alarm).toBeNull();
  });

  it('a read whose time precedes the commit time reads a zero delay, never a negative one', () => {
    expect(receiptOf(input([decision(50, c(2).id, { at: '2026-10-15T09:00:00.000Z' })]))?.delaySec).toBe(0);
  });
});
