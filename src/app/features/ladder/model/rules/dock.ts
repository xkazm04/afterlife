// What the docked command strip says: the write that `r` (or the highlighted menu item) would run, or the promotion `p`
// would open, exactly as the server planned it (`view`), or that it is still being asked for, or why the server refuses
// it, or the MR a sent promotion opened. One write at a time, named, so a key never confirms one the strip does not show.
import { groupOfNavId } from '@/components/table/model/rowNavigation';
import type { PromoteView } from '../../write/promote';
import type { WriteView } from '../../write/revoke';
import { nothingInTrack, trackChanges, type Skipped, type TrackWant } from './batch/batch';
import type { PromoteAsk } from './promote';
import { actsFrom, nothingToRevoke, revokeTargets } from './tiers';
import type { Change, ClassRow, Tier, TrackMap } from '../types';

export type DockModel =
  | { kind: 'none' }
  | { kind: 'group'; id: string; key: string }
  | { kind: 'idle'; id: string; reason: string }
  | { kind: 'write'; id: string; to: Tier; previewing: boolean; view: WriteView | undefined }
  /** A track header: every class of track `id` lowered in one write, and the classes it leaves as they are. */
  | { kind: 'batch'; id: string; want: TrackWant; changes: Change[]; skipped: Skipped[]; view: WriteView | undefined }
  | { kind: 'promote'; id: string; to: Tier; readmit: boolean; view: PromoteView | undefined };

/**
 * The promotion of the selected class, when p applies (`want`, ./promote.ts). `pinned`: p (or the Promote click) put it
 * on the strip; a quarantine, with nothing to revoke, shows it without.
 */
export interface DockPromote {
  want: PromoteAsk | null;
  pinned: boolean;
  viewOf: (id: string, to: Tier) => PromoteView | undefined;
}

/** The strip shows one line: a command up to its first field (the content is long), and all of it on hover. */
export function commandHead(display: string): string {
  const cut = display.indexOf(' -f ');
  return cut === -1 ? display : `${display.slice(0, cut)} …`;
}

/**
 * `hoverTo` is the tier of the menu item under the pointer, which the strip previews instead of the `r` target. The `r`
 * target is the default; the promotion takes its place once pinned (and nothing is hovered), or when nothing can be revoked.
 * On a track header, with `batchViewOf` (the track writes asked for), the strip shows the track's write: `want`, a
 * quarantine unless r put the one-step write on screen.
 */
export function dockModel(
  sel: string | null,
  byId: Readonly<Record<string, ClassRow>>,
  tracks: TrackMap,
  hoverTo: Tier | null,
  viewOf: (id: string, to: Tier) => WriteView | undefined,
  promote?: DockPromote,
  batchViewOf?: (track: string, want: TrackWant) => WriteView | undefined,
  want: TrackWant = 'quarantine',
): DockModel {
  if (!sel) return { kind: 'none' };
  const id = groupOfNavId(sel);
  if (id !== null) {
    if (!batchViewOf) return { kind: 'group', id, key: tracks[id]?.key ?? '' };
    const batch = trackChanges(Object.values(byId), id, want);
    if (!batch.changes.length) return { kind: 'idle', id, reason: nothingInTrack(batch) };
    return { kind: 'batch', id, want, changes: batch.changes, skipped: batch.skipped, view: batchViewOf(id, want) };
  }
  const c = byId[sel];
  if (!c) return { kind: 'none' };
  const targets = revokeTargets(actsFrom(c));
  const first = targets[0];
  const ask = promote?.want?.id === c.id ? promote.want : null;
  if (ask && (!first || (promote?.pinned && !hoverTo))) return { kind: 'promote', id: c.id, to: ask.to, readmit: ask.readmit, view: promote?.viewOf(c.id, ask.to) };
  if (!first) return { kind: 'idle', id: c.id, reason: nothingToRevoke(c) };
  const to = hoverTo && targets.includes(hoverTo) ? hoverTo : first;
  return { kind: 'write', id: c.id, to, previewing: !!hoverTo, view: viewOf(c.id, to) };
}
