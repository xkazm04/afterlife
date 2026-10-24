// A whole track lowered in one write: q (or r) on a track header. The server takes it as one revoke-class intent and one
// commit, but refuses the WHOLE write if any one change is not a lowering, human only or without a record
// (server/actions/plans/revoke.ts), so the list is computed here from the rows: each class goes to its own revoke
// target, the rest are named as skipped with why, and a track larger than one write is refused before anything is asked.
import { MAX_REVOKE_CHANGES } from '@/server/actions/intents';
import { actsFrom, nothingToRevoke, revokeTarget } from '../tiers';
import type { Change, ClassRow } from '../../types';

/** `q` quarantines every class of the track, `r` takes each one rung down from its own tier. */
export type TrackWant = 'step' | 'quarantine';

export interface Skipped {
  id: string;
  why: string;
}

export interface TrackBatch {
  changes: Change[];
  skipped: Skipped[];
  /** Why there is no write at all although classes could move: more of them than one write takes. */
  refused?: string;
}

/** The changes of lowering every class of `track`, in row order, and the classes left as they are. */
export function trackChanges(classes: readonly ClassRow[], track: string, want: TrackWant): TrackBatch {
  const changes: Change[] = [];
  const skipped: Skipped[] = [];
  for (const c of classes) {
    if (c.track !== track) continue;
    const to = revokeTarget(actsFrom(c), want);
    if (to) changes.push({ id: c.id, to });
    else skipped.push({ id: c.id, why: nothingToRevoke(c) });
  }
  if (changes.length <= MAX_REVOKE_CHANGES) return { changes, skipped };
  return { changes: [], skipped, refused: `${changes.length} classes to lower: one write takes at most ${MAX_REVOKE_CHANGES} changes, lower them a class at a time` };
}

/** The dock's line when nothing in the track moves: the refusal, or each class and why it stays. */
export function nothingInTrack(b: TrackBatch): string {
  return b.refused ?? (b.skipped.length ? b.skipped.map((s) => `${s.id} ${s.why}`).join(' · ') : 'no classes in this track');
}
