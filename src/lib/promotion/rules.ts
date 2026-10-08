// The rows of each promotion step, against trust-policy.yml's thresholds. A row is met only by a counter a task row or a
// ledger event states, or by a fact true by construction (cited where it is used). A counter nothing states reads "not
// recorded" and is never met.
import type { Counters, PromotionRules } from './types';

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

export const pct = (x: number): string => `${Math.round(x * 100)} %`;

/** A counter no row or event states: its rule is never met. */
export const NOT_RECORDED = 'not recorded';

const counted = (v: number | null | undefined, show: (n: number) => string, meets: (n: number) => boolean): Pick<PromotionRule, 'value' | 'met'> =>
  v === null || v === undefined ? { value: NOT_RECORDED, met: false } : { value: show(v), met: meets(v) };

/** "accepted outputs 3 / 5" with its cells; a counter that is not recorded draws no cells. */
const countRule = (name: string, v: number | null, need: number): PromotionRule =>
  v === null ? { name, value: NOT_RECORDED, met: false } : { name, value: `${v} / ${need}`, met: v >= need, cells: [Math.min(v, need), need] };

/**
 * Assisted to Supervised: accepted, reverts, and when the policy sets them, the guardrail blocks and the window. The
 * window is met when the record says its counts were taken over the policy's last `window_last` outputs: a record that
 * does not say (the demo fixture's) is not recorded, one counted over another window (an older policy) is not met.
 */
export function toSupervisedRules(r: Counters, t: PromotionRules['toSupervised']): PromotionRule[] {
  const rows = [countRule('accepted outputs', r.accepted, t.accepted), { name: 'reverts', ...counted(r.reverts, String, (n) => n <= t.reverts) }];
  const max = t.guardrailBlocks;
  if (max !== null) rows.push({ name: 'guardrail blocks', ...counted(r.guardrailBlocks, String, (n) => n <= max) });
  const n = t.windowLast;
  if (n !== null) rows.push({ name: `counted over the last ${n} outputs`, ...counted(r.window, (w) => `last ${w}`, (w) => w === n) });
  return rows;
}

/** Supervised to Hands-off: the counts, the mechanical proof class, and the human key when the policy asks one. */
export function toHandsOffRules(r: Counters, t: PromotionRules['toHandsOff'], proofClass: string): PromotionRule[] {
  const rows: PromotionRule[] = [
    countRule('accepted outputs', r.accepted, t.accepted),
    { name: `merged without edits ≥ ${pct(t.noEditRatio)}`, ...counted(r.noEdit, pct, (n) => n >= t.noEditRatio) },
    countRule('clean days', r.cleanDays, t.cleanDays),
    { name: 'reverts or incidents', ...counted(r.reverts, String, (n) => n === 0) },
    { name: 'mechanical proof class', value: proofClass, met: isMechanical(proofClass) },
  ];
  // human_key is true by construction: Belay's only write that raises a tier is the promotion's policy MR, which a person
  // merges. planPromote (src/server/actions/plans/promote.ts:43-49) commits the record to a branch and opens the MR, and
  // never merges it; nothing else in Belay raises a tier (the tripwire only lowers one: engine/decide/tripwire.ts:1-3).
  if (t.humanKey) rows.push({ name: 'a person merges the promotion MR (human key)', value: 'policy MR', met: true });
  return rows;
}
