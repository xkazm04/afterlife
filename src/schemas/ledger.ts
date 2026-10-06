// Append-only, hash-chained ledger: tamper-evident, not third-party anchored. Every Belay screen
// is a view over it, which is also what makes a demo take replayable.
import { createHash } from 'node:crypto';
import type { Tier } from './tier';

export type LedgerKind =
  | 'task_started'
  | 'proof_verdict'
  | 'guardrail_verdict'
  | 'tier_decision'
  | 'merged'
  | 'deployed'
  | 'outcome'
  | 'clock_event';

export interface LedgerEvent {
  seq: number;
  at: string; // ISO-8601, from the GitLab event, not the receiver's clock
  agent: string; // service account, e.g. "ai-patcher-acme"
  action_class: string; // key into trust-policy.yml classes
  kind: LedgerKind;
  tier_at_time: Tier;
  subject: { project_id: number; type: 'mr' | 'issue' | 'pipeline' | 'vulnerability' | 'deployment'; iid: number };
  payload_ref: string; // path to the Proof Block / trace in belay-ledger
  observed_by: 'poll' | 'flows_api' | 'govern_hook' | 'webhook';
  prev_hash: string;
  hash: string; // sha256(prev_hash + canonical(event without hash))
}

export const GENESIS = '0'.repeat(64);

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
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
