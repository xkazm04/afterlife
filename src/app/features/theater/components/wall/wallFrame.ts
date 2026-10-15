// What the wall draws at a film position: the entry index and where the climbers are (`motionAt`). The wall subscribes
// to THIS, not to the raw progress `p`: `p` moves every frame through an entry's whole dwell, while the climbers settle
// within the first 55-60% of it (and never move at all on an entry that does not climb, or under reduced motion).
import { motionAt, type Motion } from '../../model/derive/climb';
import type { Snapshot } from '../../model/derive/snapshots';
import { progress, type ReplayState } from '../../model/replay/state';
import { shallowEqual } from '../../model/replay/store';

export type WallFrame = Motion & { i: number };

/** The slice selector: null when the film position has no snapshot. `side`: the illustrative film's !44 line is drawn. */
export const wallFrame =
  (snaps: readonly Snapshot[], side: boolean) =>
  (s: ReplayState): WallFrame | null => {
    const snap = snaps[s.i];
    return snap ? { i: s.i, ...motionAt(snap.e, snap.beat, progress(s), s.reduced, { from: snap.from, side }) } : null;
  };

/** Two frames draw the same wall. */
export const sameFrame = (a: WallFrame | null, b: WallFrame | null): boolean => (a && b ? shallowEqual(a, b) : a === b);
