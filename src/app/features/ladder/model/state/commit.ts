// A revoke is a commit to belay-policy as you. Six seconds later the (simulated) tier-gate job reads it.
import { COMMIT_SHAS } from '../../data/policy';
import { buildPlan, commitText, MANUAL_REVOKE } from '../rules/plan';
import type { ClassRow, Head, LedgerEntry, Tier } from '../types';

/** The commit id the next revoke will get. */
export const nextSha = (shaIdx: number): string => COMMIT_SHAS[shaIdx % COMMIT_SHAS.length] ?? 'e7f1';

/** How long a commit stays "pending" before the simulated tier-gate read. */
export const PENDING_MS = 6000;

export interface Committed {
  classes: ClassRow[];
  ledger: LedgerEntry[];
  head: Head;
}

/** The classes, ledger and head after revoking `id` to `to` at clock time `t`. Nothing else moves. */
export function commitRevoke(classes: readonly ClassRow[], ledger: readonly LedgerEntry[], id: string, to: Tier, sha: string, t: string): Committed {
  const byId = Object.fromEntries(classes.map((c) => [c.id, c]));
  const plan = buildPlan(byId, [{ id, to }], MANUAL_REVOKE);
  const ids = new Set(plan.rows.map((r) => r.cls.id));
  return {
    classes: classes.map((c) => (ids.has(c.id) ? { ...c, tier: to, lease_days: null, lastMove: `revoked by you · ${t}`, pending: sha } : c)),
    ledger: [...ledger, { t, ids: [...ids], actor: 'you', where: 'Belay, on your key', kind: 'you', isNew: true, text: commitText(sha, plan.rows) }],
    head: { sha, by: 'you' },
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
