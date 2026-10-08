// Promotion eligibility: counts against trust-policy.yml's thresholds, which the server reads and hands the screen (never
// a constant here). A count is shown, never a forecast (no ETA). One rule for both sides: Ladder's Promote and the
// poller's promotion ask (server/poller/derive/promotion.ts) read it here, so they can never disagree.
import type { Tier } from '@/schemas/tier';
import { cellOf, RUNGS, rungIndex } from './rungs';
import type { PromotionRules, PromotionSubject } from './types';

/** Proof classes a machine can check; Hands-off needs one of these. */
export const MECHANICAL_PROOFS: ReadonlySet<string> = new Set([
  'exploit-test',
  'cited-diff',
  'rerun-stats',
  'repro',
  'bench-delta',
  'linked-evidence',
]);

export const isMechanical = (proofClass: string): boolean => MECHANICAL_PROOFS.has(proofClass);

export interface PromotionRule {
  name: string;
  value: string;
  met: boolean;
  /** [filled, total] cells drawn under the row, for the two count rules. */
  cells?: readonly [number, number];
}

export type Promotion =
  /** norecord: no agent holds it yet. split: several agents hold it (promote one holder by hand). untiered: tier unknown. */
  | { kind: 'never' | 'readmit' | 'ceiling' | 'norecord' | 'split' | 'untiered' }
  /** unknown: the class has no record yet. nopolicy: trust-policy.yml was not read, so there are no thresholds. */
  | { kind: 'unknown' | 'nopolicy'; next: Tier }
  | { kind: 'eligible' | 'notyet'; next: Tier; rules: PromotionRule[] };

export const pct = (x: number): string => `${Math.round(x * 100)} %`;

/** A counter no row or event states: its rule is never met. */
export const NOT_RECORDED = 'not recorded';

const counted = (v: number | null, show: (n: number) => string, meets: (n: number) => boolean): Pick<PromotionRule, 'value' | 'met'> =>
  v === null ? { value: NOT_RECORDED, met: false } : { value: show(v), met: meets(v) };

/** "accepted outputs 3 / 5" with its cells; a counter that is not recorded draws no cells. */
const countRule = (name: string, v: number | null, need: number): PromotionRule =>
  v === null ? { name, value: NOT_RECORDED, met: false } : { name, value: `${v} / ${need}`, met: v >= need, cells: [Math.min(v, need), need] };

/** `rules`: trust-policy.yml's thresholds, as the server read them; null when it could not (the counts are then not drawn). */
export function promotion(c: PromotionSubject, proofClass: string, rules: PromotionRules | null): Promotion {
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
  if (c.ask && c.ask.from === tier && c.ask.to === next) return { kind: 'eligible', next, rules: c.ask.rules.map(([name, value, met]) => ({ name, value, met })) };
  const r = c.record;
  if (!r) return { kind: 'unknown', next };
  if (!rules) return { kind: 'nopolicy', next };
  let counts: PromotionRule[];
  if (next === 'hands_off') {
    const { accepted: need, noEditRatio, cleanDays } = rules.toHandsOff;
    counts = [
      countRule('accepted outputs', r.accepted, need),
      { name: `merged without edits ≥ ${pct(noEditRatio)}`, ...counted(r.noEdit, pct, (n) => n >= noEditRatio) },
      countRule('clean days', r.cleanDays, cleanDays),
      { name: 'reverts or incidents', ...counted(r.reverts, String, (n) => n === 0) },
      { name: 'mechanical proof class', value: proofClass, met: isMechanical(proofClass) },
    ];
  } else {
    const { accepted: need, reverts } = rules.toSupervised;
    counts = [countRule('accepted outputs', r.accepted, need), { name: 'reverts', ...counted(r.reverts, String, (n) => n <= reverts) }];
  }
  return { kind: counts.every((x) => x.met) ? 'eligible' : 'notyet', next, rules: counts };
}

export const isEligible = (p: Promotion): boolean => p.kind === 'eligible';

/** The Needs-you item the poller opens for an eligible class (poller/derive/promotion.ts): one id, both sides. */
export const promotionId = (projectId: string, classId: string): string => `promote:${projectId}:${classId}`;
