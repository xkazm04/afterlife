// Append-only, hash-chained ledger: tamper-evident, not third-party anchored. Every Belay screen
// is a view over it, which is also what makes a demo take replayable.
import { createHash } from 'node:crypto';
import type { EnvironmentTier, GuardrailVerdict, LedgerKind, LedgerObserver, LedgerSubjectType, LedgerWould, WithdrawnGrant } from './chain/kinds';
import type { Tier } from './tier';

// The vocabularies and the one event parser (writer, importer and checker share it) live in ./chain; this stays the import path.
export * from './chain/kinds';
export { parseChainText, parseEventBody, parseStoredLine, type ChainRead, type EventBody, type ParseResult } from './chain/parse';
// origin/main's names for the same unions.
export type { LedgerObserver as Observer, LedgerSubjectType as SubjectType } from './chain/kinds';

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
  subject: { project_id: number; type: LedgerSubjectType; iid: number };
  payload_ref: string; // path to the Proof Block / trace in belay-ledger
  observed_by: LedgerObserver; // ci_job: written by a Belay CI component (gate, tripwire)
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
export function canonical(value: unknown): string {
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
