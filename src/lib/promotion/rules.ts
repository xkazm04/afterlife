// The rows of each promotion step, against trust-policy.yml's thresholds. A row is met only by a counter a task row or a
// ledger event states. A counter nothing states reads "not recorded" and is never met. The human key is not a row: it is
// the precondition of the promote write (HUMAN_KEY), stated beside the rows.
import type { Counters, PromotionRules } from './types';

/**
 * Proof classes a machine checks in this engine version; Hands-off needs one of these. A class the engine only stubs
 * (engine/proofs/stubs.ts STUB_CLASSES: it answers inconclusive, never pass) is not one, so 'repro' and 'bench-delta'
 * are left out until the engine builds their checkers. rules.test.ts pins the set against STUB_CLASSES.
 */
export const MECHANICAL_PROOFS: ReadonlySet<string> = new Set(['exploit-test', 'cited-diff', 'rerun-stats', 'linked-evidence']);

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

/**
 * The cooldown a record states (tier-state.yml `cooldown_until`): a row that is not met until that date, while it is
 * ahead of `now`; none once it has passed (or when the record states none). A date with no time starts at 00:00 UTC.
 */
export function cooldownRule(until: string | null | undefined, now: Date): PromotionRule | null {
  const t = until ? Date.parse(until) : Number.NaN;
  if (Number.isNaN(t) || now.getTime() >= t) return null;
  const iso = new Date(t).toISOString();
  return { name: 'cooldown', value: `until ${iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : `${iso.slice(0, 16).replace('T', ' ')} UTC`}`, met: false };
}

/**
 * The precondition of every promotion Belay prepares, stated beside the rule rather than counted as a met row: Belay's
 * only write that raises a tier is the promotion's policy MR, which planPromote (src/server/actions/plans/promote.ts)
 * opens and never merges; nothing else in Belay raises a tier (the tripwire only lowers one). trust-policy.yml's
 * human_key asks exactly this. Belay reads no GitLab approval setting, so it is stated, not checked.
 */
export const HUMAN_KEY = 'a person merges this MR; Belay never merges it';

/** Supervised to Hands-off: the counts and the mechanical proof class. */
export function toHandsOffRules(r: Counters, t: PromotionRules['toHandsOff'], proofClass: string): PromotionRule[] {
  const rows: PromotionRule[] = [
    countRule('accepted outputs', r.accepted, t.accepted),
    { name: `merged without edits ≥ ${pct(t.noEditRatio)}`, ...counted(r.noEdit, pct, (n) => n >= t.noEditRatio) },
    countRule('clean days', r.cleanDays, t.cleanDays),
    { name: 'reverts or incidents', ...counted(r.reverts, String, (n) => n === 0) },
    { name: 'mechanical proof class', value: proofClass, met: isMechanical(proofClass) },
  ];
  return rows;
}
