// SCREEN_KEYS is a hand-kept mirror of each screen's useXKeys hook. These cases read the ground truth (the tier list,
// the take cap, the hook files on disk) instead of the list, so a screen that changes or appears turns this red.
import { describe, expect, it } from 'vitest';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { MAX_TAKES } from '../../theater/model/film/fromLedger';
import { SCREEN_KEYS } from './screenKeys';

const keysOf = (screen: string): string[] => SCREEN_KEYS.find((s) => s.screen === screen)?.keys.flatMap((k) => k.keys) ?? [];

describe('SCREEN_KEYS', () => {
  it('names the Ladder tier filter by the real tier count', () => {
    expect(keysOf('Ladder')).toContain(`1-${TIER_DISPLAY_ORDER.length}`);
  });
  it('names the Theater take keys by the real take cap', () => {
    expect(keysOf('Theater')).toContain(`1-${MAX_TAKES}`);
  });
});
