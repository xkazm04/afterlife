// A revoke lands in the state only once the server answered done. Demo: the write was simulated, so the commit id is the
// demo's own and six seconds later a simulated tier-gate read settles it, with a simulated withdrawal beside it. Live: the
// commit is the one GitLab made (read back from belay-policy), and it stays pending until a poll's receipt says a gated
// MR's tier_decision read that commit (`state_rev`, written by belay-apply): ./receipt.ts settles it then, at the time
// the gate read it, so the who-acted rail draws the real gap. A gate that has not run yet leaves it pending.
import { COMMIT_SHAS } from '../../data/policy';
import { splitTier } from '@/lib/tiers';
import { clockTime } from '../clock';
import { commitText, planRows } from '../rules/plan';
import { holdersOf, rungIndex } from '../rules/tiers';
import type { Change, ClassRow, Head, LedgerEntry, Tier } from '../types';

/** The demo's commit id for the next simulated revoke. */
export const nextSha = (shaIdx: number): string => COMMIT_SHAS[shaIdx % COMMIT_SHAS.length] ?? 'e7f1';

/** How long a simulated commit stays "pending" before the simulated tier-gate read. */
export const PENDING_MS = 6000;

/** What the server said about a revoke that is done: simulated (demo), or the commit GitLab made (null: not read back). */
export type Sent = { simulated: true } | { simulated: false; commit: string | null };

/** The gate that read a pending commit, from a poll's receipt: the merge request and how long after the commit. */
export interface GateRead {
  iid: number;
  delaySec: number | null;
}

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
 * The classes, ledger and head after committing `changes` at instant `at` (labelled in the screen's zone `tz`), with `sha`
 * the commit id to show (the demo's id when simulated): one commit, every moved class pending on it, one ledger line
 * naming every move. Nothing else moves.
 * The commit waits for a tier-gate read: simulated (demo) or a receipt (live).
 */
export function commitChanges(classes: readonly ClassRow[], ledger: readonly LedgerEntry[], changes: readonly Change[], sent: Sent, sha: string | null, at: number, tz: string): Committed {
  const t = clockTime(at, tz);
  const byId = Object.fromEntries(classes.map((c) => [c.id, c]));
  const rows = planRows(byId, changes);
  const to = new Map(rows.map((r) => [r.cls.id, r.to]));
  const pending = sha;
  return {
    classes: classes.map((c) => {
      const down = to.get(c.id);
      return down ? { ...lowered(c, down), lease_days: null, lastMove: `revoked by you · ${t}`, pending, simRead: undefined } : c;
    }),
    ledger: [
      ...ledger,
      { at, t, ids: [...to.keys()], actor: 'you', where: 'Belay, on your key', kind: 'you', isNew: true, text: commitText(sha, rows), ...(sent.simulated ? { chip: 'simulated' as const } : {}) },
    ],
    head: { sha: sha ?? '?', by: 'you' },
  };
}

/** One class revoked to `to`: commitChanges with one change. */
export const commitRevoke = (classes: readonly ClassRow[], ledger: readonly LedgerEntry[], id: string, to: Tier, sent: Sent, sha: string | null, at: number, tz: string): Committed =>
  commitChanges(classes, ledger, [{ id, to }], sent, sha, at, tz);

/** "45 s", "3 min", "2 h", "3 d": how long after the commit a gate read it. A value that rounds up to the next unit is said in it. */
export function delayText(sec: number): string {
  if (sec < 120) return `${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 120) return `${min} min`;
  const h = Math.round(sec / 3600);
  return h < 48 ? `${h} h` : `${Math.round(sec / 86_400)} d`;
}

/**
 * The tier-gate job read tier-state.yml at `sha`: the pending chip goes and the ledger says so. Without `read` it is the
 * demo's simulated read, with a simulated withdrawal of what the old tier had granted; with one, a poll's receipt said
 * which merge request's gate read it (live). `at` is when, labelled in the screen's zone `tz`.
 */
export function settleCommit(classes: readonly ClassRow[], ledger: readonly LedgerEntry[], sha: string, at: number, tz: string, read?: GateRead): { classes: ClassRow[]; ledger: LedgerEntry[] } {
  const settled = classes.filter((c) => c.pending === sha);
  if (!settled.length) return { classes: [...classes], ledger: [...ledger] };
  const ids = settled.map((c) => c.id);
  const t = clockTime(at, tz);
  const after = read && read.delaySec !== null ? `, ${delayText(read.delaySec)} after the commit` : '';
  const entries: LedgerEntry[] = read
    ? [{ at, t, ids, actor: 'tier-gate job', where: 'GitLab', kind: 'gitlab', isNew: true, text: `!${read.iid}'s gate read tier-state.yml @ ${sha}${after}` }]
    : [
        { at, t, ids, actor: 'tier-gate job', where: 'GitLab', kind: 'gitlab', chip: 'simulated', isNew: true, text: `next MR pipeline read tier-state.yml @ ${sha}` },
        { at, t, ids, actor: 'belay-apply sweep', where: 'GitLab', kind: 'gitlab', chip: 'simulated', isNew: true, text: 'withdrew the approval the old tier had granted an open MR' },
      ];
  return {
    classes: classes.map((c) => (c.pending === sha ? { ...c, pending: null, ...(read ? {} : { simRead: { sha, t } }) } : c)),
    ledger: [...ledger, ...entries],
  };
}
