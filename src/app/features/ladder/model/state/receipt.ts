// A poll's receipts reached the screen (live): each class takes the receipt the poll derived for its record, and a revoke
// still pending is settled once the receipt says a gated MR read its commit. Pure: the instant of the read is the
// receipt's (`readAt`), labelled in the screen's zone, so the entry sits on the who-acted rail where the gate read it.
import type { ClassRow, EnforcementReceipt, LedgerEntry } from '../types';
import { settleCommit } from './commit';

export type Receipts = Readonly<Record<string, EnforcementReceipt | undefined>>;

/** The pending id is the commit as the screen shows it (a prefix of GitLab's id, or all of it). */
const reads = (r: EnforcementReceipt | undefined, pending: string | null): r is EnforcementReceipt & { readIid: number; readAt: string } =>
  !!r && !!pending && r.commit.startsWith(pending) && r.readIid !== null && r.readAt !== null;

/** `tz`: the screen's zone (LadderState.tz), the one a settle entry is labelled in. */
export function applyReceipts(classes: readonly ClassRow[], ledger: readonly LedgerEntry[], receipts: Receipts, tz: string): { classes: ClassRow[]; ledger: LedgerEntry[] } {
  let next: { classes: ClassRow[]; ledger: LedgerEntry[] } = {
    classes: classes.map((c) => {
      const receipt = receipts[c.id];
      if (receipt === c.receipt) return c;
      const { receipt: _old, ...rest } = c;
      void _old;
      return receipt ? { ...rest, receipt } : rest;
    }),
    ledger: [...ledger],
  };
  for (const c of next.classes) {
    const r = receipts[c.id];
    if (!reads(r, c.pending) || !c.pending) continue;
    next = settleCommit(next.classes, next.ledger, c.pending, Date.parse(r.readAt), tz, { iid: r.readIid, delaySec: r.delaySec });
  }
  return next;
}
