// belay-ledger/cycles/<project-id>.jsonl: one line per closed improvement cycle, written when the closing rescan
// credits it. Hash-chained like the event ledger (same canonical form), so an edited, dropped or reordered cycle is
// visible. A record carries instants, not day numbers: a reader counts days from the first cycle's opening.
import { createHash } from 'node:crypto';
import { canonical, GENESIS } from './ledger';
import type { Stage } from './stages';

/** What the closing rescan made of a change. A closed cycle has no pending or planned change. */
export type ClosedVerdict = 'credited' | 'nolift' | 'rejected' | 'resolved' | 'regressed';

export interface CycleChangeRecord {
  /** The MR iid; null for a probe or a drift. */
  mr_iid: number | null;
  kind: 'mr' | 'probe' | 'drift';
  stage: Stage;
  /** Rung before (null = unknown) and the rung targeted (for a drift, the rung the rescan found). */
  from: number | null;
  to: number;
  title: string;
  verdict: ClosedVerdict;
  why: string;
  lines?: number;
}

export interface CycleRecord {
  /** The cycle number, 1 first: seq n is cycle Cn. */
  seq: number;
  project_id: number;
  theme: string;
  opened_at: string;
  /** The closing rescan. */
  closed_at: string;
  /** The scan engine; credit never crosses engine versions. */
  engine: string;
  changes: CycleChangeRecord[];
  prev_hash: string;
  /** sha256(prev_hash + canonical(record without hash)) */
  hash: string;
}

export function hashCycle(r: Omit<CycleRecord, 'hash'>): string {
  return createHash('sha256').update(r.prev_hash + canonical(r)).digest('hex');
}

export function appendCycle(chain: readonly CycleRecord[], r: Omit<CycleRecord, 'seq' | 'prev_hash' | 'hash'>): CycleRecord {
  const prev = chain.at(-1);
  const body = { ...r, seq: (prev?.seq ?? 0) + 1, prev_hash: prev?.hash ?? GENESIS };
  return { ...body, hash: hashCycle(body) };
}

/**
 * The seq of the first bad record, or null when the chain verifies: each links to the one before, numbers run 1, 2, 3,
 * and each closes no earlier than it opened and opens no earlier than the last one closed.
 */
export function verifyCycles(chain: readonly CycleRecord[]): number | null {
  let prev = GENESIS;
  let closed = -Infinity;
  for (const [i, r] of chain.entries()) {
    const { hash, ...body } = r;
    const opened = Date.parse(r.opened_at);
    const shut = Date.parse(r.closed_at);
    if (r.seq !== i + 1 || r.prev_hash !== prev || hashCycle(body) !== hash) return r.seq;
    if (!(opened >= closed) || !(shut >= opened)) return r.seq;
    prev = hash;
    closed = shut;
  }
  return null;
}
