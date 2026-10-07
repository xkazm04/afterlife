// A revoke lands in the state only once the server answered done. Demo: the write was simulated, so the commit id is the
// demo's own and six seconds later a simulated tier-gate read settles it. Live: the commit is the one GitLab made (read
// back from belay-policy), and nothing settles it: Belay is not told when the next MR pipeline reads tier-state.yml.
import { COMMIT_SHAS } from '../../data/policy';
import { splitTier } from '@/lib/tiers';
import { commitText, planRows } from '../rules/plan';
import { holdersOf, rungIndex } from '../rules/tiers';
import type { ClassRow, Head, LedgerEntry, Tier } from '../types';

/** The demo's commit id for the next simulated revoke. */
export const nextSha = (shaIdx: number): string => COMMIT_SHAS[shaIdx % COMMIT_SHAS.length] ?? 'e7f1';

/** How long a simulated commit stays "pending" before the simulated tier-gate read. */
export const PENDING_MS = 6000;

/** What the server said about a revoke that is done: simulated (demo), or the commit GitLab made (null: not read back). */
export type Sent = { simulated: true } | { simulated: false; commit: string | null };

export interface Committed {
  classes: ClassRow[];
  ledger: LedgerEntry[];
  head: Head;
}

/** A class taken down to `to`: a split class lowers every holder above it (as the server's write does), the rest stay. */
function lowered(c: ClassRow, to: Tier): ClassRow {
  const holders = holdersOf(c);
  if (!holders) return { ...c, tier: to };
  const next = holders.map((h) => (rungIndex(h.tier) > rungIndex(to) ? { ...h, tier: to } : h));
  return { ...c, tier: splitTier(next), holders: next };
}

/**
 * The classes, ledger and head after revoking `id` to `to` at clock time `t`, with `sha` the commit id to show (the
 * demo's id when simulated). Nothing else moves. Only a simulated commit waits for the (simulated) tier-gate read.
 */
export function commitRevoke(classes: readonly ClassRow[], ledger: readonly LedgerEntry[], id: string, to: Tier, sent: Sent, sha: string | null, t: string): Committed {
  const byId = Object.fromEntries(classes.map((c) => [c.id, c]));
  const rows = planRows(byId, [{ id, to }]);
  const ids = new Set(rows.map((r) => r.cls.id));
  const pending = sent.simulated ? sha : null;
  return {
    classes: classes.map((c) => (ids.has(c.id) ? { ...lowered(c, to), lease_days: null, lastMove: `revoked by you · ${t}`, pending } : c)),
    ledger: [
      ...ledger,
      { t, ids: [...ids], actor: 'you', where: 'Belay, on your key', kind: 'you', isNew: true, text: commitText(sha, rows), ...(sent.simulated ? { chip: 'simulated' as const } : {}) },
    ],
    head: { sha: sha ?? '?', by: 'you' },
  };
}

/** The tier-gate job read tier-state.yml at `sha`: the pending chip goes and the ledger says so (simulated). */
export function settleCommit(classes: readonly ClassRow[], ledger: readonly LedgerEntry[], sha: string, t: string): { classes: ClassRow[]; ledger: LedgerEntry[] } {
  const settled = classes.filter((c) => c.pending === sha);
  if (!settled.length) return { classes: [...classes], ledger: [...ledger] };
  return {
    classes: classes.map((c) => (c.pending === sha ? { ...c, pending: null } : c)),
    ledger: [
      ...ledger,
      { t, ids: settled.map((c) => c.id), actor: 'tier-gate job', where: 'GitLab', kind: 'gitlab', chip: 'simulated', isNew: true, text: `next MR pipeline read tier-state.yml @ ${sha}` },
    ],
  };
}
