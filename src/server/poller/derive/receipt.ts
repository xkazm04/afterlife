// Where a tier record was enforced (src/schemas/receipt.ts): the commit of tier-state.yml that wrote it, the first gated
// merge request whose tier_decision states that commit or a later one of the list (`state_rev`, written by belay-apply),
// what the sweep withdrew on such decisions, and an alarm when such a gate still decided a tier above the record's. A
// decision stating a revision that is not in the list read is not counted: it may be older or newer, so it is not guessed.
// Pure: the commit list and the ledger events come in.
import type { LedgerEvent } from '@/schemas/ledger';
import type { EnforcementReceipt } from '@/schemas/receipt';
import { TIER_ORDER, type Ceiling, type Tier } from '@/schemas/tier';
import type { GlCommit } from '@/server/gitlab/types';
import type { StateHistory } from '../stateHistory';

/** What a receipt reads of a ledger event. */
export type ReceiptEvent = Pick<LedgerEvent, 'agent' | 'action_class' | 'kind' | 'at' | 'subject' | 'tier_at_time' | 'state_rev' | 'withdrew'>;

/** tier-state.yml's history and the project's ledger: what every receipt of one poll is derived from. */
export interface Enforcement {
  history: StateHistory;
  events: readonly ReceiptEvent[];
}

export interface ReceiptInput {
  agent: string;
  classId: string;
  /** The record's tier and the class's ceiling: the gate grants at most the lower of the two. */
  tier: Tier;
  ceiling: Ceiling;
  /** tier-state.yml's commits, newest first, and the one that wrote this record (null: not known). */
  commits: readonly GlCommit[];
  writer: GlCommit | null;
  /** The project's ledger, in seq order. */
  events: readonly ReceiptEvent[];
}

const rank = (t: Ceiling): number => (TIER_ORDER as readonly string[]).indexOf(t);

/** Null when the commit that wrote the record is not known: nothing can be said to have read it. */
export function receiptOf(i: ReceiptInput): EnforcementReceipt | null {
  const pos = new Map(i.commits.map((c, n) => [c.id, n]));
  const at = i.writer ? pos.get(i.writer.id) : undefined;
  if (!i.writer || at === undefined) return null;
  const cap = rank(i.ceiling) >= 0 && rank(i.ceiling) < rank(i.tier) ? rank(i.ceiling) : rank(i.tier);
  const reads = i.events.filter((e) => {
    const p = e.state_rev === undefined ? undefined : pos.get(e.state_rev);
    return e.kind === 'tier_decision' && e.agent === i.agent && e.action_class === i.classId && p !== undefined && p <= at;
  });
  const first = reads[0];
  const over = reads.find((e) => rank(e.tier_at_time) > cap);
  const delay = first ? (Date.parse(first.at) - Date.parse(i.writer.committedAt)) / 1000 : Number.NaN;
  return {
    commit: i.writer.id,
    committedAt: i.writer.committedAt,
    readIid: first?.subject.iid ?? null,
    readAt: first?.at ?? null,
    delaySec: Number.isNaN(delay) ? null : Math.max(0, Math.round(delay)),
    withdrew: reads.flatMap((e) => (e.withdrew ?? []).map((what) => ({ what, iid: e.subject.iid, at: e.at }))),
    alarm: over ? { iid: over.subject.iid, tier: over.tier_at_time, at: over.at } : null,
  };
}
