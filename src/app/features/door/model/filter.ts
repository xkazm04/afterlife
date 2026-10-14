// The legend as a filter: a mark can be locked (sticky) and then outranks the hover preview. Pure.
import type { FleetProject } from '@/lib/demo/types';
import { MARK_TEST, type MarkKind } from './words';

/** The chip's name for each mark. */
export const MARK_LABEL: Record<MarkKind, string> = {
  needs: 'Needs you',
  stale: 'Stale',
  quar: 'Quarantined',
  norec: 'No record yet',
  split: 'Split between agents',
  setup: 'Setting up',
  nsu: 'Not watched',
  watch: 'Watching',
};

/** Clicking a mark locks it; clicking the locked mark again lets it go. */
export const toggleLock = (locked: MarkKind | null, k: MarkKind): MarkKind | null => (locked === k ? null : k);

/** The mark in force: the lock if there is one, else whatever the pointer previews. */
export const activeMark = (locked: MarkKind | null, hover: MarkKind | null): MarkKind | null => locked ?? hover;

/** What Escape does: let the lock go first, then climb a level. */
export const escapeStep = (locked: MarkKind | null): 'unlock' | 'up' => (locked ? 'unlock' : 'up');

/** Ids of the projects the mark does not light (to dim), or null with no mark. */
export const dimSet = (mark: MarkKind | null, projects: readonly FleetProject[]): ReadonlySet<string> | null =>
  mark ? new Set(projects.filter((p) => !MARK_TEST[mark](p)).map((p) => p.id)) : null;

/** Ids of the projects whose quarantined classes glow red: only while the quarantine mark is in force. */
export const redSet = (mark: MarkKind | null, projects: readonly FleetProject[]): ReadonlySet<string> | null =>
  mark === 'quar' ? new Set(projects.filter(MARK_TEST.quar).map((p) => p.id)) : null;
