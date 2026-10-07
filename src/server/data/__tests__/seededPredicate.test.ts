import { describe, expect, it } from 'vitest';
import { isSeeded, SEEDED_ITEMS } from '../live/seeded';

describe('the seeded predicate', () => {
  it('holds the demo\'s five inbox items and the gap picks', () => {
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) expect(isSeeded(id)).toBe(true);
    expect(SEEDED_ITEMS.size).toBeGreaterThanOrEqual(5);
  });

  it('is false for a group\'s own item', () => {
    expect(isSeeded('readmit:ledgerline:qa.file-bug')).toBe(false);
    expect(isSeeded('')).toBe(false);
  });
});
