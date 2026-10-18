// The ledger's closed vocabularies, declared once: the writer (engine ledger append), the importer (server
// parseLedgerJsonl) and the checker (ledger-record) all read them through ./parse, and src/schemas/ledger.ts re-exports
// them with the LedgerEvent type derived from them.
import type { Withdrawn } from '../receipt';
import { TIER_ORDER, type Tier } from '../tier';

export const LEDGER_KINDS = ['task_started', 'proof_verdict', 'guardrail_verdict', 'tier_decision', 'merged', 'deployed', 'outcome', 'clock_event'] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

/** Who saw the event; ci_job: written by a Belay CI component (gate, tripwire). */
export const OBSERVERS = ['poll', 'flows_api', 'govern_hook', 'webhook', 'ci_job'] as const;
export type LedgerObserver = (typeof OBSERVERS)[number];

export const SUBJECT_TYPES = ['mr', 'issue', 'pipeline', 'vulnerability', 'deployment'] as const;
export type LedgerSubjectType = (typeof SUBJECT_TYPES)[number];

/** What the guardrail said, on a guardrail_verdict event (gitlab/components/scripts/decide/apply-gate.mjs writes it). */
export type GuardrailVerdict = 'pass' | 'block';
export const GUARDRAIL_VERDICTS: readonly GuardrailVerdict[] = ['pass', 'block'];

/** GitLab's deployment tier, on a deployed event's environment. */
export type EnvironmentTier = 'production' | 'staging' | 'testing' | 'development' | 'other';
export const ENVIRONMENT_TIERS: readonly EnvironmentTier[] = ['production', 'staging', 'testing', 'development', 'other'];

/** What belay-apply's sweep took back from a merge request the gate had granted, on a tier_decision (gitlab/apply/sweep.mjs). */
export type WithdrawnGrant = Withdrawn;
export const WITHDRAWN_GRANTS: readonly WithdrawnGrant[] = ['approval', 'auto_merge'];

/** A commit id (sha1, 40 hex): the tier-state.yml revision a tier_decision's gate read (`state_rev`). */
export const STATE_REV = /^[0-9a-f]{40}$/;

/** What the gate decides (engine/decide/gate.ts Decision), as a tier_decision's `would` states it. */
export type GateDecision = 'merge' | 'approve' | 'wait' | 'block';
export const GATE_DECISIONS: readonly GateDecision[] = ['merge', 'approve', 'wait', 'block'];

/**
 * What the same gate would have decided for the same merge request with the holder's record one rung up, under the class
 * ceiling (engine/decide/shadow.ts): the next rung's shadow decision. Recorded, never applied.
 */
export interface LedgerWould {
  tier: Tier;
  decision: GateDecision;
}

/** The rung above `t`; null at the top. */
export const rungAbove = (t: Tier): Tier | null => TIER_ORDER[TIER_ORDER.indexOf(t) + 1] ?? null;

/**
 * A tier_decision's `would` as stated, or null when it is not one: exactly a tier and a decision, the tier the rung above
 * the decision's own (tier_at_time). The parser refuses anything else; the readers of a verified chain skip it.
 */
export function wouldOf(v: unknown, tierAtTime: Tier): LedgerWould | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const w = v as Record<string, unknown>;
  const decision = GATE_DECISIONS.find((d) => d === w.decision);
  if (Object.keys(w).length !== 2 || !decision || w.tier !== rungAbove(tierAtTime)) return null;
  return { tier: w.tier as Tier, decision };
}
