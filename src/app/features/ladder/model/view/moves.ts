// Questions the screen asks of the ledger: who touched this class, which events sit on the timeline.
import { isClockTime } from '../clock';
import type { ActorKind, LedgerEntry } from '../types';

const DAY_MS = 86_400_000;

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

/** Newest first, only the actors that are switched on. */
export const filterByKinds = (ledger: readonly LedgerEntry[], kinds: readonly ActorKind[]): LedgerEntry[] =>
  ledger.filter((e) => kinds.includes(e.kind)).reverse();

/**
 * The events the to-scale timeline draws: those within a day of the newest of them (by instant). Only an entry labelled
 * with a clock time is a candidate: one labelled "11 d ago" was old when the screen opened, and its label could not name
 * its place on the rail.
 */
export function timedEntries(entries: readonly LedgerEntry[]): LedgerEntry[] {
  const recent = entries.filter((e) => isClockTime(e.t));
  const newest = Math.max(...recent.map((e) => e.at));
  return recent.filter((e) => newest - e.at < DAY_MS);
}
