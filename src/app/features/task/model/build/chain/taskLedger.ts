// Server-only: @/schemas/ledger hashes with node:crypto. Only loadTasks imports this; a client component reads the plain
// `ledger` and `ledgerCheck` it produces, never this module.
import { verifyChain, type LedgerEvent } from '@/schemas/ledger';
import type { LedgerRow, TaskLedger } from '../../types';

/** The merge request an event is about, in the form a task's `mr` takes (`!44`), or null for any other subject. */
const mrOf = (e: LedgerEvent): string | null => (e.subject.type === 'mr' ? `!${e.subject.iid}` : null);

function rowOf(e: LedgerEvent): LedgerRow {
  return { seq: e.seq, at: e.at, kind: e.kind, text: `${e.agent} · ${e.payload_ref}`, prev: e.prev_hash, hash: e.hash };
}

/**
 * The ledger of each task, from the real chain: the whole chain is verified once (the first broken seq, or null), and a
 * task's rows are the events about its merge request, in seq order, with their own sha256 hash and prev_hash. A task with
 * no merge request, or one the chain never names, holds no rows. The events are grouped by merge request once, so a docket
 * of n tasks reads the chain once, not n times.
 */
export function chainLedgers(events: readonly LedgerEvent[]): (mr: string | null) => TaskLedger {
  const brokenAt = verifyChain(events);
  const byMr = new Map<string, LedgerEvent[]>();
  for (const e of events) {
    const mr = mrOf(e);
    if (mr === null) continue;
    const rows = byMr.get(mr);
    if (rows) rows.push(e);
    else byMr.set(mr, [e]);
  }
  return (mr) => ({
    ledger: mr === null ? [] : (byMr.get(mr) ?? []).map(rowOf),
    ledgerCheck: { hash: 'sha256', brokenAt },
  });
}
