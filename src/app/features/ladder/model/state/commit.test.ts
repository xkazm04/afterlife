// How a commit lands in the state and how long a gate took to read it (./commit.ts).
import { describe, expect, it } from 'vitest';
import { enforcementOf } from '../enforcement/enforcement';
import type { ClassRow, EnforcementReceipt } from '../types';
import { commitRevoke, delayText } from './commit';

describe('delayText: how long after the commit a gate read it', () => {
  it('says seconds, then minutes, then hours', () => {
    expect([45, 119, 120, 180, 3599, 7200, 36_000].map(delayText)).toEqual(['45 s', '119 s', '2 min', '3 min', '60 min', '2 h', '10 h']);
  });
  it('a value that rounds up to the next unit is said in it: never "120 min" or "48 h"', () => {
    expect(delayText(7170)).toBe('2 h');
    expect(delayText(7199)).toBe('2 h');
    expect(delayText(172_000)).toBe('2 d');
  });
  it('a gate that read it days later says days, not a pile of hours', () => {
    expect(delayText(3 * 86_400)).toBe('3 d');
  });
});

const OLD = 'c1'.repeat(20);
const receipt: EnforcementReceipt = {
  commit: OLD, committedAt: '2026-10-15T10:00:00.000Z', readIid: 44, readAt: '2026-10-15T10:01:00.000Z', delaySec: 60, withdrew: [], alarm: null,
};
const row = (o: Partial<ClassRow> = {}): ClassRow => ({ id: 'a', track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null, record: null, lastMove: '', pending: null, ...o });
const AT = Date.parse('2026-10-15T12:00:00.000Z');

describe('commitRevoke: the receipt of the record it replaced', () => {
  it('a live revoke with no commit id read back no longer shows the old record\'s receipt as its enforcement', () => {
    const [moved, kept] = commitRevoke([row({ receipt }), row({ id: 'b', receipt })], [], 'a', 'assisted', { simulated: false, commit: null }, null, AT, 'UTC').classes;
    expect(enforcementOf(moved!, true)?.facts.find((f) => f.label === 'Committed')?.text).not.toBe(OLD.slice(0, 8));
    expect(moved!.receipt).toBeUndefined();
    expect(kept!.receipt).toBe(receipt); // a class the commit did not move keeps its own
  });
  it('a live revoke with its commit is pending on it: the class page says what is known, not the old read', () => {
    const [moved] = commitRevoke([row({ receipt })], [], 'a', 'assisted', { simulated: false, commit: '9f9f9f9f' }, '9f9f9f9f', AT, 'UTC').classes;
    expect(enforcementOf(moved!, true)?.facts.map((f) => f.text)).toEqual(['9f9f9f9f', 'awaiting the next gated MR', 'nothing yet']);
  });
});
