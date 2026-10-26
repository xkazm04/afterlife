import { describe, expect, it } from 'vitest';
import type { ActorKind, LedgerEntry } from '../types';
import { ALL_KINDS, KIND_LABELS, entriesFor, filterByKinds, lastMoveIndex, timedEntries } from './moves';

/** An entry at an instant (epoch ms), with the label the screen gives it. */
const e = (t: string, ids: string[], kind: ActorKind, at: number): LedgerEntry => ({ at, t, ids, actor: 'x', where: '', kind, text: '' });
const T0 = Date.parse('2026-10-06T14:00:00Z');
const ledger = [e('11 d ago', ['a'], 'person', T0 - 11 * 86_400_000), e('14:00:00', ['a', 'b'], 'gitlab', T0), e('14:00:05', ['b'], 'afterlife', T0 + 5000), e('14:00:09', ['a'], 'you', T0 + 9000)];

describe('ledger questions', () => {
  it('finds the newest entry that mentions a class, -1 when it never moved', () => {
    expect(lastMoveIndex(ledger, 'a')).toBe(3);
    expect(lastMoveIndex(ledger, 'b')).toBe(2);
    expect(lastMoveIndex(ledger, 'zz')).toBe(-1);
  });
  it('lists the entries of one class, oldest first', () => {
    expect(entriesFor(ledger, 'b').map((x) => x.t)).toEqual(['14:00:00', '14:00:05']);
  });
  it('keeps only the switched-on actors, newest first, and leaves the ledger alone', () => {
    expect(filterByKinds(ledger, ['gitlab', 'you']).map((x) => x.t)).toEqual(['14:00:09', '14:00:00']);
    expect(filterByKinds(ledger, []).length).toBe(0);
    expect(ledger.map((x) => x.t)[0]).toBe('11 d ago');
  });
  it('keeps the clock-timed entries for the axis, not "11 d ago"', () => {
    expect(timedEntries(ledger).map((x) => x.t)).toEqual(['14:00:00', '14:00:05', '14:00:09']);
  });
  it('toggles every actor kind that has a label, and no other', () => {
    expect([...ALL_KINDS].sort()).toEqual(Object.keys(KIND_LABELS).sort());
  });
});
