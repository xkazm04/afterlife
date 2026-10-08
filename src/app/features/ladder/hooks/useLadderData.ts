'use client';

import { useCallback, useMemo, useReducer } from 'react';
import type { PolicyRules } from '@/server/data/types';
import { isGroupNavId } from '@/components/table/model/rowNavigation';
import { promotion, type Promotion } from '@/lib/promotion';
import { initialState } from '../model/state/initial';
import { ladderReducer } from '../model/state/reducer';
import type { LadderSeed } from '../model/state/state';
import type { ClassRow, Track, TrackMap } from '../model/types';
import { proofClassOf, tierCounts, visibleClasses } from '../model/view/filters';
import { buildRows, resolveSelection } from '../model/view/rows';

/**
 * The reducer and everything derived from it: the rows on screen, the resolved selection, promotion per class (counted
 * against `policy`, trust-policy.yml's thresholds as the server read them).
 */
export function useLadderData(seed: LadderSeed, trackList: readonly Track[], policy: PolicyRules | null) {
  const [state, dispatch] = useReducer(ladderReducer, seed, initialState);
  const tracks: TrackMap = useMemo(() => Object.fromEntries(trackList.map((t) => [t.id, t])), [trackList]);
  const trackIds = useMemo(() => trackList.map((t) => t.id), [trackList]);
  const byId = useMemo(() => Object.fromEntries(state.classes.map((c) => [c.id, c])), [state.classes]);
  const { src, filt, q } = state;
  const visible = useMemo(() => visibleClasses(state.order, byId, { src, filt, q }, tracks, policy), [state.order, byId, src, filt, q, tracks, policy]);
  const view = useMemo(() => buildRows(visible, state.grouped, state.collapsed), [visible, state.grouped, state.collapsed]);
  const sel = resolveSelection(state.sel, view.flat);
  const selected = sel && !isGroupNavId(sel) ? byId[sel] : undefined;
  const counts = useMemo(() => tierCounts(state.classes), [state.classes]);
  const promotionOf = useCallback((c: ClassRow): Promotion => promotion(c, proofClassOf(tracks, c), policy), [tracks, policy]);
  return { state, dispatch, tracks, trackIds, byId, visible, view, sel, selected, counts, promotionOf };
}

export type LadderData = ReturnType<typeof useLadderData>;
