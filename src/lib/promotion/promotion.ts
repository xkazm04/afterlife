// Promotion eligibility: counts against trust-policy.yml's thresholds, which the server reads and hands the screen (never
// a constant here). A count is shown, never a forecast (no ETA). One rule for both sides: Ladder's Promote and the
// poller's promotion ask (server/poller/derive/promotion.ts) read it here, so they can never disagree.
import type { Tier } from '@/schemas/tier';
import { cooldownRule, HUMAN_KEY, toHandsOffRules, toSupervisedRules, type PromotionRule } from './rules';
import { cellOf, RUNGS, rungIndex } from './rungs';
import type { PromotionRules, PromotionSubject } from './types';

export type Promotion =
  /** norecord: no agent holds it yet. split: several agents hold it (promote one holder by hand). untiered: tier unknown. */
  | { kind: 'never' | 'readmit' | 'ceiling' | 'norecord' | 'split' | 'untiered' }
  /** unknown: the class has no record yet. nopolicy: trust-policy.yml was not read, so there are no thresholds. */
  | { kind: 'unknown' | 'nopolicy'; next: Tier }
  /** `precondition`: what holds of the promote write itself (HUMAN_KEY), stated beside the rows, never one of them. */
  | { kind: 'eligible' | 'notyet'; next: Tier; rules: PromotionRule[]; precondition: string };

/**
 * `rules`: trust-policy.yml's thresholds, as the server read them; null when it could not (the counts are then not drawn).
 * `now`: what the record's cooldown is read against (the poll's clock on the poller's side).
 */
export function promotion(c: PromotionSubject, proofClass: string, rules: PromotionRules | null, now: Date = new Date()): Promotion {
  const tier = cellOf(c);
  if (tier === 'human_only') return { kind: 'never' };
  if (tier === 'no_record') return { kind: 'norecord' };
  if (tier === 'refused') return { kind: 'split' };
  if (tier === null) return { kind: 'untiered' };
  if (tier === 'quarantined') return { kind: 'readmit' };
  const i = rungIndex(tier);
  const next = RUNGS[i + 1];
  if (!next || i >= rungIndex(c.ceiling)) return { kind: 'ceiling' };
  // live: the poll counted the record and this same rule found it eligible (the counts are not stored on the class)
  if (c.ask && c.ask.from === tier && c.ask.to === next) return { kind: 'eligible', next, rules: c.ask.rules.map(([name, value, met]) => ({ name, value, met })), precondition: HUMAN_KEY };
  const r = c.record;
  if (!r) return { kind: 'unknown', next };
  if (!rules) return { kind: 'nopolicy', next };
  const counts = next === 'hands_off' ? toHandsOffRules(r, rules.toHandsOff, proofClass) : toSupervisedRules(r, rules.toSupervised);
  const cooldown = cooldownRule(c.cooldownUntil, now);
  if (cooldown) counts.push(cooldown);
  return { kind: counts.every((x) => x.met) ? 'eligible' : 'notyet', next, rules: counts, precondition: HUMAN_KEY };
}

export const isEligible = (p: Promotion): boolean => p.kind === 'eligible';

/** The Needs-you item the poller opens for an eligible class (poller/derive/promotion.ts): one id, both sides. */
export const promotionId = (projectId: string, classId: string): string => `promote:${projectId}:${classId}`;
