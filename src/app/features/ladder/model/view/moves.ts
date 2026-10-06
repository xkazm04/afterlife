// Questions the screen asks of the ledger: who touched this class, which events sit on the timeline.
import { isClockTime } from '../clock';
import type { ActorKind, ClassRow, LedgerEntry } from '../types';

/** The actor toggles of "All moves", in display order. */
export const KIND_LABELS: Readonly<Record<ActorKind, string>> = {
  gitlab: 'GitLab jobs',
  you: 'you',
  person: 'policy MRs',
  belay: 'Belay polls',
};
export const ALL_KINDS: readonly ActorKind[] = ['gitlab', 'you', 'person', 'belay'];

/** Index of the newest ledger entry that mentions the class, or -1 when it never moved. */
export function lastMoveIndex(ledger: readonly LedgerEntry[], id: string): number {
  let last = -1;
  ledger.forEach((e, i) => {
    if (e.ids.includes(id)) last = i;
  });
  return last;
}

export const entriesFor = (ledger: readonly LedgerEntry[], id: string): LedgerEntry[] => ledger.filter((e) => e.ids.includes(id));

export function entriesForTrack(ledger: readonly LedgerEntry[], classes: readonly ClassRow[], track: string): LedgerEntry[] {
  const ids = new Set(classes.filter((c) => c.track === track).map((c) => c.id));
  return ledger.filter((e) => e.ids.some((id) => ids.has(id)));
}

/** Newest first, only the actors that are switched on. */
export const filterByKinds = (ledger: readonly LedgerEntry[], kinds: readonly ActorKind[]): LedgerEntry[] =>
  ledger.filter((e) => kinds.includes(e.kind)).reverse();

/** Events with a clock time (not "11 d ago"): the ones that can be placed on a to-scale timeline. */
export const timedEntries = (entries: readonly LedgerEntry[]): LedgerEntry[] => entries.filter((e) => isClockTime(e.t));
