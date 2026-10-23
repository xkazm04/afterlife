'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { groupOfNavId } from '@/components/table/model/rowNavigation';
import { trackChanges, type TrackWant } from '../model/rules/batch/batch';
import { actsFrom, revokeTarget } from '../model/rules/tiers';
import type { Change, ClassRow, Tier } from '../model/types';
import { askRevoke, askRevokeTrack, trackKey, writeKey, type WriteView } from '../write/revoke';

export interface RevokeWrites {
  /** The exact write behind revoking `id` to `to`, as the server planned it. Undefined while it is being asked. */
  viewOf: (id: string, to: Tier) => WriteView | undefined;
  /** Ask for that write once (previewAction). Asking again is free until `clear`. */
  want: (id: string, to: Tier) => void;
  /** Replace one view: the new preview of a "changed" answer, or the reason of a refusal. */
  put: (id: string, to: Tier, view: WriteView) => void;
  /** The write that lowers every class of a track (../model/rules/batch), as the server planned it. */
  trackViewOf: (track: string, want: TrackWant) => WriteView | undefined;
  putTrack: (track: string, want: TrackWant, view: WriteView) => void;
  /** Which track write is on screen for the selected track header: the quarantine, until r shows the one step. */
  trackWant: TrackWant;
  showTrack: (track: string, want: TrackWant) => void;
  /** A write landed: every preview is now stale. Answers still in flight are dropped. */
  clear: () => void;
}

/** The selection and the rows, for a track header's write (the Ladder; a class page has no track header). */
export interface TrackSelection {
  sel: string | null;
  state: { classes: readonly ClassRow[] };
}

/**
 * The writes on screen. The selected class's revoke target (or the target the menu highlights) is asked for as soon as
 * it is in view, so the class page and the dock show the server's exact commands and diff before r can send them. A
 * selected track header asks for its whole-track write the same way.
 */
export function useRevokeWrite(project: string, selected: ClassRow | undefined, hoverTo: Tier | null, track?: TrackSelection): RevokeWrites {
  const [views, setViews] = useState<Readonly<Record<string, WriteView>>>({});
  /** Bumped by `clear`, so the write in view is asked for again even when the selection did not move. */
  const [round, setRound] = useState(0);
  const [shownTrack, setShownTrack] = useState<{ track: string; want: TrackWant } | null>(null);
  const asked = useRef(new Set<string>());
  const generation = useRef(0);

  const ask = useCallback((key: string, plan: () => Promise<WriteView>) => {
    if (asked.current.has(key)) return;
    asked.current.add(key);
    const gen = generation.current;
    void plan().then((view) => {
      if (gen === generation.current) setViews((v) => ({ ...v, [key]: view }));
    });
  }, []);
  const want = useCallback((id: string, to: Tier) => ask(writeKey(id, to), () => askRevoke(project, id, to)), [ask, project]);
  const wantTrack = useCallback(
    (tid: string, w: TrackWant, changes: readonly Change[]) => ask(trackKey(tid, w), () => askRevokeTrack(project, tid, changes, w)),
    [ask, project],
  );
  const putKey = useCallback((key: string, view: WriteView) => {
    asked.current.add(key);
    setViews((v) => ({ ...v, [key]: view }));
  }, []);
  const put = useCallback((id: string, to: Tier, view: WriteView) => putKey(writeKey(id, to), view), [putKey]);
  const putTrack = useCallback((tid: string, w: TrackWant, view: WriteView) => putKey(trackKey(tid, w), view), [putKey]);
  const clear = useCallback(() => {
    generation.current += 1;
    asked.current.clear();
    setViews({});
    setRound((r) => r + 1);
  }, []);
  const viewOf = useCallback((id: string, to: Tier) => views[writeKey(id, to)], [views]);
  const trackViewOf = useCallback((tid: string, w: TrackWant) => views[trackKey(tid, w)], [views]);
  const showTrack = useCallback((tid: string, w: TrackWant) => setShownTrack({ track: tid, want: w }), []);

  const id = selected?.id;
  const to = selected ? (hoverTo ?? revokeTarget(actsFrom(selected))) : null;
  useEffect(() => {
    if (id && to) want(id, to);
  }, [id, to, want, round]);

  const tid = track?.sel ? groupOfNavId(track.sel) : null;
  const trackWant: TrackWant = tid && shownTrack?.track === tid ? shownTrack.want : 'quarantine';
  const classes = track?.state.classes;
  useEffect(() => {
    if (!tid || !classes) return;
    const batch = trackChanges(classes, tid, trackWant);
    if (batch.changes.length) wantTrack(tid, trackWant, batch.changes);
  }, [tid, trackWant, classes, wantTrack, round]);

  return { viewOf, want, put, trackViewOf, putTrack, trackWant, showTrack, clear };
}
