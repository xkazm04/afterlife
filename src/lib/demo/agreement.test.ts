// The demo's own words agree with the promotion rule: a class whose lastMove says "eligible" is eligible by promotion()
// against the demo's policy (policy/trust-policy.yml), and no other class is. When they disagree, scripts/build-demo.mjs
// is fixed, never this test.
import { describe, expect, it } from 'vitest';
import { isEligible, promotion } from '@/lib/promotion';
import { repoPolicy } from '@/server/data/policy';
import { DEMO_NOW } from './clock';
import { DEMO } from './index';

/** "record 16 / 15 · eligible" says it; "record 6 / 15 · not eligible" says it is not. */
const says = (lastMove: string): boolean => /\beligible\b/.test(lastMove) && !/\bnot eligible\b/.test(lastMove);
const proofOf = (track: string): string => DEMO.tracks.find((t) => t.id === track)?.proof.cls ?? '';

describe('the demo fixture and promotion() agree on who is eligible', () => {
  const rules = repoPolicy();
  it('reads the policy, and at least one class says eligible', () => {
    expect(rules).not.toBeNull();
    expect(DEMO.actionClasses.filter((c) => says(c.lastMove)).map((c) => c.id)).toEqual(['qa.file-bug']);
  });
  for (const c of DEMO.actionClasses) {
    it(`${c.id}: "${c.lastMove}"`, () => {
      expect(isEligible(promotion(c, proofOf(c.track), rules, DEMO_NOW))).toBe(says(c.lastMove));
    });
  }
});
