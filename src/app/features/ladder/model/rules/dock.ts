// What the docked command strip says: the write that `r` (or the highlighted menu item) would run, exactly as the server
// planned it (`view`), or that it is still being asked for, or why the server refuses it.
import { isGroupNavId } from '@/components/table/model/rowNavigation';
import type { WriteView } from '../../write/revoke';
import { nothingToRevoke, revokeTargets } from './tiers';
import type { ClassRow, Tier, TrackMap } from '../types';

export type DockModel =
  | { kind: 'none' }
  | { kind: 'group'; id: string; key: string }
  | { kind: 'idle'; id: string; reason: string }
  | { kind: 'write'; id: string; to: Tier; previewing: boolean; view: WriteView | undefined };

/** The strip shows one line: a command up to its first field (the content is long), and all of it on hover. */
export function commandHead(display: string): string {
  const cut = display.indexOf(' -f ');
  return cut === -1 ? display : `${display.slice(0, cut)} …`;
}

/** `hoverTo` is the tier of the menu item under the pointer, which the strip previews instead of the `r` target. */
export function dockModel(
  sel: string | null,
  byId: Readonly<Record<string, ClassRow>>,
  tracks: TrackMap,
  hoverTo: Tier | null,
  viewOf: (id: string, to: Tier) => WriteView | undefined,
): DockModel {
  if (!sel) return { kind: 'none' };
  if (isGroupNavId(sel)) {
    const id = sel.slice(2);
    return { kind: 'group', id, key: tracks[id]?.key ?? '' };
  }
  const c = byId[sel];
  if (!c) return { kind: 'none' };
  const targets = revokeTargets(c.tier);
  const first = targets[0];
  if (!first) return { kind: 'idle', id: c.id, reason: nothingToRevoke(c.tier) };
  const to = hoverTo && targets.includes(hoverTo) ? hoverTo : first;
  return { kind: 'write', id: c.id, to, previewing: !!hoverTo, view: viewOf(c.id, to) };
}
