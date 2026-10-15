// For the tests that pin the rows of a policy without `gated` (promotion.test.ts, rules.test.ts): the repo's policy sets
// it on supervised_to_hands_off, so they read that policy with the key left out. gated.test.ts pins the key itself.
import type { PromotionRules } from '../types';

const drop = <T extends { gated?: unknown }>(step: T): Omit<T, 'gated'> => {
  const { gated: _gated, ...rest } = step;
  void _gated;
  return rest;
};

/** `rules` as a policy that sets no `gated` on either step reads. */
export const ungated = <R extends PromotionRules>(rules: R): R => ({ ...rules, toSupervised: drop(rules.toSupervised), toHandsOff: drop(rules.toHandsOff) });
