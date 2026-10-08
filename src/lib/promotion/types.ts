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

/** trust-policy.yml's promotion block. Policy numbers, not measurements. */
export interface PromotionRules {
  /**
   * assisted_to_supervised. `guardrailBlocks`: the most guardrail blocks allowed in the counts; `windowLast`: the counts
   * are taken over the holder's last that many outputs. Null: the policy does not set it, so no rule asks it.
   */
  toSupervised: { accepted: number; reverts: number; guardrailBlocks: number | null; windowLast: number | null };
  /** supervised_to_hands_off. `humanKey`: a person merges the promotion (human_key: true). */
  toHandsOff: { accepted: number; noEditRatio: number; cleanDays: number; humanKey: boolean };
}

/** The class the rule is asked about. `cell` absent: the tier is the cell (the demo fixture sends none). */
export interface PromotionSubject {
  tier: Ceiling;
  ceiling: Ceiling;
  record: Counters | null;
  cell?: ClassCell;
  holders?: readonly Holder[];
  ask?: PromotionAsk;
}
