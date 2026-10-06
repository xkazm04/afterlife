import { describe, expect, it } from 'vitest';
import { TIER_DISPLAY_ORDER, TIER_META, TIER_RANK, isCeiling } from './tiers';

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
