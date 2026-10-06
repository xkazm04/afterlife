import { describe, expect, it } from 'vitest';
import type { ClassRow, LedgerEntry } from '../types';
import { computeOrder, defaultDir, toggleSort } from './sort';

const row = (id: string, o: Partial<ClassRow> = {}): ClassRow => ({
  id, track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null,
  record: { accepted: 5, needed: null, noEdit: 1, cleanDays: 5, reverts: 0 }, lastMove: '', pending: null, ...o,
});
const ev = (ids: string[]): LedgerEntry => ({ t: '14:00:00', ids, actor: 'a', where: 'w', kind: 'you', text: '' });

const classes = [
  row('b', { track: 'T2', record: { accepted: 9, needed: null, noEdit: 0.5, cleanDays: 2, reverts: 1 }, lease_days: 4 }),
  row('a', { track: 'T1', tier: 'hands_off' }),
  row('c', { track: 'T3', record: null, tier: 'human_only', ceiling: 'human_only' }),
];

describe('computeOrder', () => {
  it('orders by last move, newest first, never-moved last in the original order', () => {
    const ledger = [ev(['a']), ev(['b'])];
    expect(computeOrder(classes, ledger, { key: 'move', dir: -1 })).toEqual(['b', 'a', 'c']);
    expect(computeOrder(classes, [], { key: 'move', dir: -1 })).toEqual(['b', 'a', 'c']);
  });
  it('sorts text ascending and numbers descending by default', () => {
    expect(computeOrder(classes, [], { key: 'name', dir: 1 })).toEqual(['a', 'b', 'c']);
    expect(computeOrder(classes, [], { key: 'acc', dir: -1 })).toEqual(['b', 'a', 'c']);
    expect(computeOrder(classes, [], { key: 'tier', dir: -1 })).toEqual(['a', 'b', 'c']);
  });
  it('sinks classes with no record whichever way the column runs', () => {
    expect(computeOrder(classes, [], { key: 'acc', dir: 1 })).toEqual(['a', 'b', 'c']);
    expect(computeOrder(classes, [], { key: 'clean', dir: -1 }).at(-1)).toBe('c');
  });
  it('sinks classes without a lease', () => {
    expect(computeOrder(classes, [], { key: 'lease', dir: 1 })).toEqual(['b', 'a', 'c']);
    expect(computeOrder(classes, [], { key: 'lease', dir: -1 })).toEqual(['b', 'a', 'c']);
  });
});

describe('toggleSort', () => {
  it('flips the same column and resets the direction on another', () => {
    expect(toggleSort({ key: 'move', dir: -1 }, 'move')).toEqual({ key: 'move', dir: 1 });
    expect(toggleSort({ key: 'move', dir: 1 }, 'name')).toEqual({ key: 'name', dir: 1 });
    expect(toggleSort({ key: 'name', dir: 1 }, 'acc')).toEqual({ key: 'acc', dir: -1 });
    expect(defaultDir('track')).toBe(1);
  });
});
