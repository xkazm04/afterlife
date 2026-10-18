import { GENESIS, fnv } from '../build/ledger';
import type { LedgerCheck, LedgerRow, TaskView } from '../types';
import { derivedVerdict } from './verdict';

/**
 * Replay state: how far the verdict has been re-derived from the ledger.
 * null = not replaying (everything shown); -1 = only the claims, as the agent wrote them; n >= 1 = the first n checks landed.
 */
export type ReplayState = number | null;

export const REPLAY_STEP_MS = 750;
export const REPLAY_CLEAR_MS = 2400;
export const REPLAY_START: ReplayState = -1;

/** Has check number `i` landed? */
export const checkShown = (rv: ReplayState, i: number): boolean => rv === null || i < rv;
/** Has the verdict landed (every check shown)? */
export const replayDone = (rv: ReplayState, checkCount: number): boolean => rv === null || rv >= checkCount;

/** The state after one tick; `null` once every check has landed (the replay is over). */
export function nextReplay(rv: number, checkCount: number): number | null {
  const next = rv < 0 ? 1 : rv + 1;
  return next >= checkCount ? null : next;
}

/** The ledger row to light while `rv` checks have landed: progress through the checks maps onto the rows. */
export function ledgerRowAt(rv: number, checkCount: number, rowCount: number): number {
  if (rowCount <= 0 || checkCount <= 0) return 0;
  return Math.min(rowCount - 1, Math.round((Math.max(rv, 0) / checkCount) * (rowCount - 1)));
}

/** The seq of the first illustrative (FNV) row whose hash is not the one its predecessor and its own fields give, or null. */
export function firstBrokenSeq(rows: readonly LedgerRow[]): number | null {
  let prev = GENESIS;
  for (const r of rows) {
    if (r.prev !== prev || r.hash !== fnv(prev + r.seq + r.at + r.kind + r.text)) return r.seq;
    prev = r.hash;
  }
  return null;
}

/**
 * Where the task's chain breaks, as the replay checks it: illustrative rows are re-checked here, from the rows themselves;
 * the real chain was verified on the server (node:crypto) and its result is read from `ledgerCheck`.
 */
export const ledgerBreak = (task: TaskView): number | null =>
  task.ledgerCheck.hash === 'illustrative' ? firstBrokenSeq(task.ledger) : task.ledgerCheck.brokenAt;

/** The inspector's word for a ledger check. */
export const ledgerCheckLabel = (c: LedgerCheck): string =>
  c.brokenAt !== null ? `chain broken at #${c.brokenAt}` : c.hash === 'sha256' ? 'sha256 · chain verified' : 'illustrative';

/** The replay's result, stating the chain check as it was computed: verified, illustrative, or where it breaks. */
export function replayMessage(task: TaskView): string {
  const first = task.ledger[0]?.seq;
  const last = task.ledger[task.ledger.length - 1]?.seq;
  const broken = ledgerBreak(task);
  const check = broken !== null ? `HASHES DO NOT MATCH, chain broken at #${broken}` : task.ledgerCheck.hash === 'sha256' ? 'sha256 chain verified' : 'illustrative hashes match';
  return `Replayed ledger #${first}–#${last} · ${task.ledger.length} rows, ${check} · ${derivedVerdict(task).verdict} · agent not re-run`;
}

export const replayStartStatus = (task: TaskView): string => `ledger #${task.ledger[0]?.seq} · claims as the agent wrote them`;

export function replayStepStatus(task: TaskView, row: number): string {
  const r = task.ledger[row];
  const broken = ledgerBreak(task);
  return r ? `ledger #${r.seq} · ${r.kind} · hash ${r.hash.slice(0, 7)} ${broken !== null && r.seq >= broken ? '✗' : '✓'}` : '';
}

export const REPLAY_DONE_STATUS = 'replayed · identical to the record';

/** A task with no ledger rows has nothing to re-derive its verdict from: the replay does not start. */
export const REPLAY_NOTHING = 'Nothing to replay: no ledger rows are held for this task';
