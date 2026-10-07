import { describe, expect, it } from 'vitest';
import { cellName, cellRank, isCeiling, standingCount, STANDING_META, TIER_DISPLAY_ORDER, TIER_META, TIER_RANK, tiersKnown, type ClassCell } from './tiers';

describe('tier metadata', () => {
  it('covers every displayed tier with a unique letter', () => {
    const letters = TIER_DISPLAY_ORDER.map((t) => TIER_META[t].letter);
    expect(new Set(letters).size).toBe(5);
    expect(letters).toEqual(['H', 'S', 'A', 'Q', 'P']);
  });
  it('ranks hands-off highest and human-only lowest', () => {
    const ranked = [...TIER_DISPLAY_ORDER].sort((a, b) => TIER_RANK[b] - TIER_RANK[a]);
    expect(ranked[0]).toBe('hands_off');
    expect(ranked[4]).toBe('human_only');
  });
  it('recognises tier keys', () => {
    expect(isCeiling('supervised')).toBe(true);
    expect(isCeiling('god_mode')).toBe(false);
    expect(isCeiling(null)).toBe(false);
  });
});

describe('class cells', () => {
  it('names a standing apart from a quarantine, and unknown as unknown', () => {
    expect(['quarantined', 'no_record', 'refused', null].map((c) => cellName(c as ClassCell))).toEqual(['Quarantined', 'No record yet', 'Blocked', 'unknown']);
    expect(STANDING_META.no_record.letter).not.toBe(TIER_META.quarantined.letter);
  });
  it('knows the tiers from the cells alone', () => {
    expect(tiersKnown({ classTiers: { a: null, b: 'no_record' } })).toBe(true);
    expect(tiersKnown({ classTiers: { a: null } })).toBe(false);
    expect(tiersKnown({ classTiers: {} })).toBe(false);
  });
  it('ranks a standing below every tier and unknown as null', () => {
    expect(cellRank('no_record')).toBeLessThan(cellRank('human_only')!);
    expect(cellRank(null)).toBeNull();
    expect(standingCount({ classTiers: { a: 'no_record', b: 'no_record', c: 'refused' } }, 'no_record')).toBe(2);
  });
});
