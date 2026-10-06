// What the docked command strip says: always the exact write that `r` (or the highlighted menu item) would run.
import { isGroupNavId } from '@/components/table/model/rowNavigation';
import { buildPlan, MANUAL_REVOKE } from './plan';
import { nothingToRevoke, revokeTargets } from './tiers';
import type { ClassRow, Tier, TrackMap } from '../types';

export type DockModel =
  | { kind: 'none' }
  | { kind: 'group'; id: string; key: string }
  | { kind: 'idle'; id: string; reason: string }
  | { kind: 'write'; id: string; to: Tier; previewing: boolean; msg: string; cmd: string[] };

/** `hoverTo` is the tier of the menu item under the pointer, which the strip previews instead of the `r` target. */
export function dockModel(sel: string | null, byId: Readonly<Record<string, ClassRow>>, tracks: TrackMap, hoverTo: Tier | null): DockModel {
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
  const plan = buildPlan(byId, [{ id: c.id, to }], MANUAL_REVOKE);
  return { kind: 'write', id: c.id, to, previewing: !!hoverTo, msg: plan.msg, cmd: plan.cmd };
}
