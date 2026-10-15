// Append-only, hash-chained ledger: tamper-evident, not third-party anchored. Every Belay screen
// is a view over it, which is also what makes a demo take replayable.
import { createHash } from 'node:crypto';
import type { Withdrawn } from './receipt';
import { TIER_ORDER, type Tier } from './tier';

export type LedgerKind =
  | 'task_started'
  | 'proof_verdict'
  | 'guardrail_verdict'
  | 'tier_decision'
  | 'merged'
  | 'deployed'
  | 'outcome'
  | 'clock_event';

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
 * the decision's own (tier_at_time). The parsers refuse anything else; the readers of a verified chain skip it.
 */
export function wouldOf(v: unknown, tierAtTime: Tier): LedgerWould | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const w = v as Record<string, unknown>;
  const decision = GATE_DECISIONS.find((d) => d === w.decision);
  if (Object.keys(w).length !== 2 || !decision || w.tier !== rungAbove(tierAtTime)) return null;
  return { tier: w.tier as Tier, decision };
}

/** Where a deployed event deployed to: the environment's name and GitLab's tier for it. */
export interface LedgerEnvironment {
  name: string;
  tier: EnvironmentTier;
}

export interface LedgerEvent {
  seq: number;
  at: string; // ISO-8601, from the GitLab event, not the receiver's clock
  agent: string; // service account, e.g. "ai-patcher-acme"
  action_class: string; // key into trust-policy.yml classes
  kind: LedgerKind;
  tier_at_time: Tier;
  subject: { project_id: number; type: 'mr' | 'issue' | 'pipeline' | 'vulnerability' | 'deployment'; iid: number };
  payload_ref: string; // path to the Proof Block / trace in belay-ledger
  observed_by: 'poll' | 'flows_api' | 'govern_hook' | 'webhook' | 'ci_job'; // ci_job: written by a Belay CI component (gate, tripwire)
  /**
   * guardrail_verdict only: the verdict, pass or block. Absent on every other kind and on an event written before the gate
   * stated it. When absent the key is absent, never null: canonical() would hash a null, and an event without a verdict
   * must hash as it always did. An explicit undefined hashes as absent, as JSON writes it.
   */
  verdict?: GuardrailVerdict;
  /**
   * deployed only: the environment it deployed to. Absent on every other kind and on an event written before it was
   * stated. When absent the key is absent, never null, for the same reason as `verdict`: every existing chain hashes as before.
   */
  environment?: LedgerEnvironment;
  /**
   * tier_decision only: the commit of tier-state.yml the gate read (GitLab's last_commit_id of the file on belay-policy),
   * so the poller can tell which revoke a gated merge request already obeyed. Absent on every other kind and on a decision
   * written before it was stated; absent, never null, for the same reason as `verdict`.
   */
  state_rev?: string;
  /**
   * tier_decision only: what the sweep withdrew from the merge request because the gate, re-run against `state_rev`, no
   * longer grants it (non-empty, each at most once). Absent: nothing was withdrawn, or it was not stated.
   */
  withdrew?: WithdrawnGrant[];
  /**
   * tier_decision only: what the gate would have decided at the next rung (the rung above tier_at_time), from a second,
   * shadow run of the same gate on the same inputs (gitlab/components/scripts/decide/apply-gate.mjs stamps it). Never
   * applied: no label, no approval, no merge comes from it. Absent at the top rung or the class ceiling, and on a decision
   * written before it was stated; absent, never null, for the same reason as `verdict`.
   */
  would?: LedgerWould;
  prev_hash: string;
  hash: string; // sha256(prev_hash + canonical(event without hash))
}

export const GENESIS = '0'.repeat(64);

/** Sorted keys, JSON values. A key whose value is undefined is skipped, as JSON.stringify drops it from the stored line. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashEvent(e: Omit<LedgerEvent, 'hash'>): string {
  return createHash('sha256').update(e.prev_hash + canonical(e)).digest('hex');
}

export function append(chain: readonly LedgerEvent[], e: Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>): LedgerEvent {
  const prev = chain.at(-1);
  const body = { ...e, seq: (prev?.seq ?? 0) + 1, prev_hash: prev?.hash ?? GENESIS };
  return { ...body, hash: hashEvent(body) };
}

/** Returns the seq of the first broken link, or null when the chain verifies. */
export function verifyChain(chain: readonly LedgerEvent[]): number | null {
  let prev = GENESIS;
  for (const e of chain) {
    const { hash, ...body } = e;
    if (e.prev_hash !== prev || hashEvent(body) !== hash) return e.seq;
    prev = hash;
  }
  return null;
}
