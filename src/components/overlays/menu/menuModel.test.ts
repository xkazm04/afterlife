import { describe, expect, it } from 'vitest';
import { enabledIndexes, isAction, moveActive, type MenuEntry } from './menuModel';

const noop = () => {};
const items: MenuEntry[] = [
  { head: 'Sort by' },
  { label: 'Attention', run: noop, checked: true },
  { label: 'Name', run: noop },
  { sep: true },
  { label: 'Ascending', run: noop, disabled: true },
  { label: 'Show Groups', run: noop, checked: false },
];

describe('enabledIndexes', () => {
  it('skips headings, separators and disabled items', () => {
    expect(enabledIndexes(items)).toEqual([1, 2, 5]);
  });
  it('recognises actions', () => {
    expect(isAction(items[1]!)).toBe(true);
    expect(isAction(items[3]!)).toBe(false);
  });
});

describe('moveActive', () => {
  it('starts at the first / last enabled item from nothing', () => {
    expect(moveActive(items, -1, 'next')).toBe(1);
    expect(moveActive(items, -1, 'prev')).toBe(5);
  });
  it('steps over the skipped entries and wraps', () => {
    expect(moveActive(items, 2, 'next')).toBe(5);
    expect(moveActive(items, 5, 'next')).toBe(1);
    expect(moveActive(items, 1, 'prev')).toBe(5);
  });
  it('jumps to the ends', () => {
    expect(moveActive(items, 2, 'first')).toBe(1);
    expect(moveActive(items, 2, 'last')).toBe(5);
  });
  it('returns -1 when nothing can be highlighted', () => {
    expect(moveActive([{ head: 'x' }, { sep: true }], -1, 'next')).toBe(-1);
  });
});
