'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { LadderSeed } from '../model/state/state';
import type { Ceiling, Tier } from '../model/types';
import { useRevokeActions } from './revoke/useRevokeActions';
import type { LadderData } from './useLadderData';
import { usePromoteAction, type PromoteScreen } from './usePromoteAction';
import type { PromoteWrites } from './usePromoteWrite';
import type { RevokeWrites } from './useRevokeWrite';

/**
 * Everything the screen does: select, filter, sort, and the writes. A revoke, of one class or of a whole track, confirms
 * the write the server planned (./revoke/useRevokeActions). A promotion confirms the policy MR the server planned
 * (usePromoteAction). Belay writes only on a click or a key.
 */
export function useLadderActions({
  project,
  data,
  writes,
  promos,
  promoteScreen,
  revokeShown,
  stamp,
  seed,
  tableRef,
  openDetail,
  onReset,
  onShow,
}: {
  /** The project the classes belong to (the index id the server actions take). */
  project: string;
  data: LadderData;
  writes: RevokeWrites;
  /** The promotions on screen, and where: p sends only the one the screen shows. */
  promos: PromoteWrites;
  promoteScreen: PromoteScreen;
  /** Is the revoke of `id` on screen (not replaced on the dock by its promotion)? */
  revokeShown: (id: string) => boolean;
  /** The instant now (epoch ms): the screen's clock (useSimClock). */
  stamp: () => number;
  seed: LadderSeed;
  tableRef: RefObject<HTMLDivElement | null>;
  openDetail: (id?: string) => void;
  onReset: () => void;
  /** Put the write of revoking `id` to `to` on screen (the dock and the class page), before anything can send it. */
  onShow: (id: string, to: Tier) => void;
}) {
  const { toast, status } = useToast();
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  });
  useEffect(() => {
    const live = timers.current;
    return () => live.forEach(clearTimeout);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  const focusTable = useCallback(() => tableRef.current?.focus({ preventScroll: true }), [tableRef]);
  const { dispatch } = data;

  const select = useCallback((id: string) => dispatch({ type: 'select', id }), [dispatch]);

  const { revoke, revokeTrack, revokeKey } = useRevokeActions({ project, latest, dispatch, writes, promos, revokeShown, onShow, stamp, later, focusTable });
  const promote = usePromoteAction(project, data, promos, promoteScreen);

  const setSource = useCallback(
    (src: string) => {
      dispatch({ type: 'source', src });
      if (tableRef.current) tableRef.current.scrollTop = 0;
    },
    [dispatch, tableRef],
  );
  const setFilter = useCallback((tier: Ceiling | null) => dispatch({ type: 'filter', tier }), [dispatch]);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    dispatch({ type: 'reset', seed });
    onReset();
    toast('Demo reset');
  }, [dispatch, seed, onReset, toast]);

  return { select, revoke, revokeTrack, promote, revokeKey, setSource, setFilter, reset, openDetail, focusTable, flash: status };
}

export type LadderActions = ReturnType<typeof useLadderActions>;
