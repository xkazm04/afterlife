// What one ledger event states, as label / value rows: one table keyed by LedgerEvent's own keys, so the next key the
// chain gains is a typecheck error here until it is described or hidden on purpose. Client-safe: it imports only types
// (../ledger imports node:crypto). A key the event does not state gives no row; nothing is inferred or invented.
import type { LedgerEvent } from '../ledger';
import type { WithdrawnGrant } from './kinds';

export interface Fact {
  label: string;
  value: string;
}

type Row<K extends keyof LedgerEvent> = { label: string; value: (v: NonNullable<LedgerEvent[K]>) => string };
/** Every key of LedgerEvent, optional ones too: a row, or 'hidden' (stated elsewhere on purpose). */
type Table = { [K in keyof LedgerEvent]-?: Row<K> | 'hidden' };

const HASH_PREFIX = 12;
const REV_PREFIX = 8;
const WITHDRAWN: Record<WithdrawnGrant, string> = { approval: 'the approval', auto_merge: 'the auto-merge' };

/** In display order. */
export const FACTS: Table = {
  kind: { label: 'Kind', value: (v) => v },
  action_class: { label: 'Class', value: (v) => v },
  tier_at_time: { label: 'Tier at the time', value: (v) => v },
  verdict: { label: 'Verdict', value: (v) => v },
  environment: { label: 'Environment', value: (v) => `${v.name} (${v.tier})` },
  state_rev: { label: 'Tier-state read', value: (v) => v.slice(0, REV_PREFIX) },
  withdrew: { label: 'Withdrew', value: (v) => v.map((w) => WITHDRAWN[w]).join(' and ') },
  would: { label: 'Next rung would', value: (v) => `${v.decision} at ${v.tier}` },
  subject: { label: 'Subject', value: (v) => `${v.type === 'mr' ? `MR !${v.iid}` : `${v.type} ${v.iid}`} · project ${v.project_id}` },
  payload_ref: { label: 'Payload', value: (v) => v },
  observed_by: { label: 'Observed by', value: (v) => v },
  at: { label: 'At', value: (v) => v },
  hash: { label: 'Hash', value: (v) => `${v.slice(0, HASH_PREFIX)}…` },
  // the entry carries these: its seq and its agent (the inspector's header); the previous link is verifyChain's
  seq: 'hidden',
  agent: 'hidden',
  prev_hash: 'hidden',
};

/** The rows of what `e` states, in FACTS order; an absent key has none. */
export function eventFacts(e: LedgerEvent): Fact[] {
  return (Object.keys(FACTS) as (keyof LedgerEvent)[]).flatMap((k) => {
    const row = FACTS[k];
    const v = e[k];
    if (row === 'hidden' || v === undefined || v === null) return [];
    return [{ label: row.label, value: (row.value as (x: typeof v) => string)(v) }];
  });
}
