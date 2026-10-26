'use client';

import { useCallback, useMemo, useReducer } from 'react';
import type { PolicyRules } from '@/server/data/types';
import { isGroupNavId } from '@/components/table/model/rowNavigation';
import { promotion, type Promotion } from '@/lib/promotion';
import { storeReducer, type LadderStore } from '../model/session/store';
import { initialState } from '../model/state/initial';
import type { LadderSeed } from '../model/state/state';
import type { ClassRow, Track, TrackMap } from '../model/types';
import { proofClassOf, tierCounts, visibleClasses } from '../model/view/filters';
import { buildRows, resolveSelection } from '../model/view/rows';
import { useLadderSession } from '../screen/session';

const storeOf = (seed: LadderSeed): LadderStore => ({ core: seed, ledger: { ledger: seed.ledger, quotes: seed.quotes }, state: initialState(seed) });

/**
 * The state and everything derived from it: the rows on screen, the resolved selection, promotion per class (counted
 * against `policy`, trust-policy.yml's thresholds as the server read them). On the screen host the state is the session's
 * (screen/session.tsx: the list and every class page share it); outside it (a test) the screen keeps its own, from `seed`.
 * `page`: the class a class page is about (its selection, whatever the list selects).
 */
export function useLadderData(seed: LadderSeed, trackList: readonly Track[], policy: PolicyRules | null, page?: string) {
  const session = useLadderSession();
  const [own, ownDispatch] = useReducer(storeReducer, seed, storeOf);
  const state = (session?.store ?? own).state;
  const dispatch = session?.dispatch ?? ownDispatch;
  const tracks: TrackMap = useMemo(() => Object.fromEntries(trackList.map((t) => [t.id, t])), [trackList]);
  const trackIds = useMemo(() => trackList.map((t) => t.id), [trackList]);
  const byId = useMemo(() => Object.fromEntries(state.classes.map((c) => [c.id, c])), [state.classes]);
  const { src, filt, q } = state;
  const visible = useMemo(() => visibleClasses(state.order, byId, { src, filt, q }, tracks, policy), [state.order, byId, src, filt, q, tracks, policy]);
  const view = useMemo(() => buildRows(visible, state.grouped, state.collapsed), [visible, state.grouped, state.collapsed]);
  const sel = page ?? resolveSelection(state.sel, view.flat);
  const selected = sel && !isGroupNavId(sel) ? byId[sel] : undefined;
  const counts = useMemo(() => tierCounts(state.classes), [state.classes]);
  const promotionOf = useCallback((c: ClassRow): Promotion => promotion(c, proofClassOf(tracks, c), policy), [tracks, policy]);
  return { state, dispatch, tracks, trackIds, byId, visible, view, sel, selected, counts, promotionOf };
}

export type LadderData = ReturnType<typeof useLadderData>;
