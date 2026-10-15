// SCREEN_KEYS is a hand-kept mirror of each screen's useXKeys hook. These cases read the ground truth (the tier list,
// the take cap, the hook files on disk) instead of the list, so a screen that changes or appears turns this red.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
  it('has a row for every screen that registers a useXKeys hook', () => {
    const features = fileURLToPath(new URL('../../', import.meta.url));
    const hooks = readdirSync(features, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => {
        try {
          return readdirSync(`${features}${d.name}/hooks`).filter((f) => /^use\w*Keys\.ts$/.test(f));
        } catch {
          return [];
        }
      });
    expect(hooks.length).toBe(6);
    expect(SCREEN_KEYS.length).toBe(hooks.length);
  });
});
