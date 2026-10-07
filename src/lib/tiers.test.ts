import { describe, expect, it } from 'vitest';
import { cellName, cellRank, isCeiling, splitTier, standingCount, STANDING_META, TIER_DISPLAY_ORDER, TIER_META, TIER_RANK, tiersKnown, type ClassCell } from './tiers';

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
    expect(['quarantined', 'no_record', 'refused', null].map((c) => cellName(c as ClassCell))).toEqual(['Quarantined', 'No record yet', 'Split', 'unknown']);
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

describe('a class several agents hold', () => {
  const holders = [{ agent: 'ai-qa-a', tier: 'supervised' }, { agent: 'ai-qa-b', tier: 'assisted' }] as const;
  it('names each holder at its own tier, and never says blocked or refuses', () => {
    expect(cellName('refused', holders)).toBe('Split: ai-qa-a Supervised · ai-qa-b Assisted');
    expect(`${STANDING_META.refused.name} ${STANDING_META.refused.means}`).not.toMatch(/block|refuse/i);
  });
  it('summarises at the most restrictive holder', () => {
    expect(splitTier(holders)).toBe('assisted');
    expect(splitTier([{ agent: 'a', tier: 'hands_off' }, { agent: 'b', tier: 'quarantined' }])).toBe('quarantined');
    expect(cellRank('refused', holders)).toBe(cellRank('assisted'));
    expect(cellRank('refused')).toBe(0);
  });
});
