// What the promotion rule reads: a class as the Ladder and the poller both hold it, and trust-policy.yml's thresholds as
// the server reads them (server/data/policy.ts rulesOf). Plain types, no logic.
import type { RecordCounters } from '@/lib/demo/types';
import type { ClassCell, Holder } from '@/lib/tiers';
import type { Ceiling, Tier } from '@/schemas/tier';

/** A record's counters, each on its own: null is a counter no task or ledger event states (never zero). */
export type Counters = RecordCounters;

/**
 * The promotion the last poll opened in Needs you for a class (live): the poll counted its record and this same rule found
 * it eligible, from `from` to `to`. `rules`: [rule, value, met], as the ask carries them.
 */
export interface PromotionAsk {
  id: string;
  from: Tier;
  to: Tier;
  rules: readonly (readonly [string, string, boolean])[];
}

/**
 * A step's `gated: all`: every accepted output it counts must have been decided by belay-apply's gate (a tier_decision
 * event). Absent: the policy does not set it, so no rule asks it.
 */
export type Gated = 'all';

/**
 * A step's `trial: {min, catches}`: the next rung's trial (src/schemas/trial.ts) must have resolved at least `min` merge
 * requests the rung above would have acted on alone, with at most `catches` of them caught by a person. Absent: no rule asks it.
 */
export interface TrialThreshold { min: number; catches: number }

/** trust-policy.yml's promotion block. Policy numbers, not measurements. */
export interface PromotionRules {
  /**
   * assisted_to_supervised. `guardrailBlocks`: the most guardrail blocks allowed in the counts; `windowLast`: the counts
   * are taken over the holder's last that many outputs. Null: the policy does not set it, so no rule asks it.
   */
  toSupervised: { accepted: number; reverts: number; guardrailBlocks: number | null; windowLast: number | null; gated?: Gated; trial?: TrialThreshold };
  /** supervised_to_hands_off. `humanKey`: a person merges the promotion (human_key: true). */
  toHandsOff: { accepted: number; noEditRatio: number; cleanDays: number; humanKey: boolean; gated?: Gated; trial?: TrialThreshold };
}

/** The class the rule is asked about. `cell` absent: the tier is the cell (the demo fixture sends none). */
export interface PromotionSubject {
  tier: Ceiling;
  ceiling: Ceiling;
  record: Counters | null;
  cell?: ClassCell;
  holders?: readonly Holder[];
  ask?: PromotionAsk;
  /**
   * tier-state.yml's `cooldown_until` on the record (a date, or a date and time), stamped by the tripwire and by a revoke:
   * no promotion before it. Absent or null: the record states none.
   */
  cooldownUntil?: string | null;
}

/**
 * The human key as read back from GitLab, read only: on belay-policy's default branch push is allowed to no one and a merge
 * needs Code Owner approval, and in belay-policy an MR's author cannot approve it. `missing`: each setting that is not in
 * place, worded for a person; `why`: what could not be read (unknown, or failed with a setting not read); `where`:
 * "belay-policy main"; `demo`: the demo's illustrative answer, not read from GitLab.
 */
export interface HumanKeyRead {
  state: 'verified' | 'failed' | 'unknown';
  missing: readonly string[];
  why?: string;
  where?: string;
  demo?: true;
}
