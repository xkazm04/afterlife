// Promotion eligibility: counts against the policy's thresholds. A count is shown, never a forecast (no ETA).
import type { ClassRow, Tier } from '../types';
import { RUNGS, rungIndex } from './tiers';

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

/** The thresholds Belay did not measure: trust-policy.yml sets them. */
export const HANDS_OFF_DEFAULT_NEEDED = 15;
export const ASSISTED_NEEDED = 5;
export const CLEAN_DAYS_NEEDED = 14;
export const NO_EDIT_NEEDED = 0.9;

export interface PromotionRule {
  name: string;
  value: string;
  met: boolean;
  /** [filled, total] cells drawn under the row, for the two count rules. */
  cells?: readonly [number, number];
}

export type Promotion =
  | { kind: 'never' | 'readmit' | 'ceiling' }
  | { kind: 'unknown'; next: Tier }
  | { kind: 'eligible' | 'notyet'; next: Tier; rules: PromotionRule[] };

export const pct = (x: number): string => `${Math.round(x * 100)} %`;

type Subject = Pick<ClassRow, 'tier' | 'ceiling' | 'record'>;

export function promotion(c: Subject, proofClass: string): Promotion {
  if (c.tier === 'human_only') return { kind: 'never' };
  if (c.tier === 'quarantined') return { kind: 'readmit' };
  const i = rungIndex(c.tier);
  const next = RUNGS[i + 1];
  if (!next || i >= rungIndex(c.ceiling)) return { kind: 'ceiling' };
  const r = c.record;
  if (!r) return { kind: 'unknown', next };
  let rules: PromotionRule[];
  if (next === 'hands_off') {
    const need = r.needed || HANDS_OFF_DEFAULT_NEEDED;
    rules = [
      { name: 'accepted outputs', value: `${r.accepted} / ${need}`, met: r.accepted >= need, cells: [Math.min(r.accepted, need), need] },
      { name: 'merged without edits ≥ 90 %', value: pct(r.noEdit), met: r.noEdit >= NO_EDIT_NEEDED },
      { name: 'clean days', value: `${r.cleanDays} / 14`, met: r.cleanDays >= CLEAN_DAYS_NEEDED, cells: [r.cleanDays, CLEAN_DAYS_NEEDED] },
      { name: 'reverts or incidents', value: String(r.reverts), met: r.reverts === 0 },
      { name: 'mechanical proof class', value: proofClass, met: isMechanical(proofClass) },
    ];
  } else {
    rules = [
      { name: 'accepted outputs', value: `${r.accepted} / ${ASSISTED_NEEDED}`, met: r.accepted >= ASSISTED_NEEDED, cells: [Math.min(r.accepted, ASSISTED_NEEDED), ASSISTED_NEEDED] },
      { name: 'reverts', value: String(r.reverts), met: r.reverts === 0 },
    ];
  }
  return { kind: rules.every((x) => x.met) ? 'eligible' : 'notyet', next, rules };
}

export const isEligible = (p: Promotion): boolean => p.kind === 'eligible';

/** Why Promote is greyed, for the status line. */
export const WHY_NOT: Record<Exclude<Promotion['kind'], 'eligible'>, string> = {
  notyet: 'the record does not qualify yet (↵ shows the counts)',
  ceiling: 'it is at its ceiling',
  readmit: 'it is quarantined: re-admit in Needs you, at Assisted at most',
  never: 'it is never an agent',
  unknown: 'there is no record yet',
};

/** Tooltip of the row's Promote button. */
export function promoteTitle(kind: Promotion['kind']): string {
  if (kind === 'eligible') return 'Promote via a policy MR (p)';
  return kind === 'ceiling' ? 'At its ceiling' : 'Record does not qualify yet';
}

/** The muted line shown instead of rule counts. */
export const NO_RULES: Record<'ceiling' | 'readmit' | 'never' | 'unknown', string> = {
  ceiling: 'At its ceiling · higher is a track rebuild',
  readmit: 'Quarantined · re-admit at Assisted at most',
  never: 'Never an agent',
  unknown: 'No record yet',
};
