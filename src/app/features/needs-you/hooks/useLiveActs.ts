'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import type { NeedsYouItem } from '@/lib/demo';
import { recallAction } from '@/server/actions/runs/recallAction';
import type { LiveEvidence } from '../model/evidence/evidence';
import { liveIntent, writeName } from '../model/live';
import { LIVE_EMPTY, liveAnswers, liveReduce, liveViews } from '../model/slot/liveActs';
import { beginSend, needsAsk, needsRecall } from '../model/slot/slot';
import { askPolicyMr, sendPolicyMr } from '../write/promote';

/**
 * The live list's writes. Selecting a promotion or a re-admit asks the server for its exact write (previewAction, nothing
 * runs); Run confirms the preview on screen by its id (confirmAction), never anything else. Each item is one write slot
 * (model/slot, the desk's rule) in a pure reducer (model/slot/liveActs.ts): this hook only asks and confirms. Changed puts
 * the new write on screen, refused and failed say so, done names the MR, and no answer closes Run until it is asked again:
 * Ask again then first asks the server what that preview did (recallAction), and only asks afresh when it cannot say.
 * An item whose class moved since the proposal (its evidence's canRun is false) is never sent, from a click or a key.
 */
const still = () => () => {};
const NONE: Readonly<Record<string, LiveEvidence>> = {};
const itemParam = () => new URLSearchParams(window.location.search).get('item');

export function useLiveActs(items: readonly NeedsYouItem[], project: string, evidence: Readonly<Record<string, LiveEvidence>> = NONE) {
  // `?item=<id>` opens that item selected (Ladder's p on an eligible class), when it is listed, until a click picks another
  const wanted = useSyncExternalStore(still, itemParam, () => null);
  const [picked, select] = useState<string | null | undefined>(undefined);
  const sel = picked !== undefined ? picked : wanted && items.some((n) => n.id === wanted) ? wanted : null;
  const [state, dispatch] = useReducer(liveReduce, LIVE_EMPTY);
  const asking = useRef(new Set<string>()); // in flight only: whether to ask is the slot's (needsAsk)
  const sendingNow = useRef(new Set<string>()); // in flight, before the 'sending' render lands

  const intentOf = useCallback((id: string) => {
    const item = items.find((n) => n.id === id);
    return item ? liveIntent(item, project) : null;
  }, [items, project]);

  const toAsk = sel && needsAsk(state.slots[sel]) ? sel : null;
  useEffect(() => {
    const intent = toAsk ? intentOf(toAsk) : null;
    if (!toAsk || !intent || asking.current.has(toAsk)) return;
    asking.current.add(toAsk);
    void askPolicyMr(intent).then((view) => {
      asking.current.delete(toAsk);
      dispatch({ type: 'viewed', id: toAsk, view });
    });
  }, [toAsk, intentOf]);

  /** A preview that failed, or a confirm that got no answer: ask again (an unsure one asks what its preview did first). */
  const recalling = useRef(new Set<string>());
  const retry = useCallback((id: string) => {
    const slot = state.slots[id];
    if (!needsRecall(slot) || slot?.view?.kind !== 'preview') return dispatch({ type: 'retry', id });
    if (recalling.current.has(id)) return;
    recalling.current.add(id);
    const intent = intentOf(id);
    const item = items.find((n) => n.id === id);
    const what = intent ? writeName(intent) : undefined;
    recallAction(slot.view.preview.previewId)
      .catch(() => ({ kind: 'unknown' as const }))
      .then((recall) => dispatch({ type: 'recalled', id, item, recall, ...(what ? { what } : {}) }))
      .finally(() => recalling.current.delete(id));
  }, [state.slots, intentOf, items]);

  const run = useCallback((id: string) => {
    const intent = intentOf(id);
    const slot = state.slots[id];
    const ev = evidence[id];
    if (!intent || !beginSend(slot) || sendingNow.current.has(id) || (ev?.kind === 'class' && !ev.canRun)) return;
    const item = items.find((n) => n.id === id);
    sendingNow.current.add(id);
    dispatch({ type: 'sending', id });
    const what = writeName(intent);
    sendPolicyMr(intent, slot?.view)
      .then((response) => dispatch({ type: 'ran', id, item, response, what }), () => dispatch({ type: 'ran', id, item, response: null, what }))
      .finally(() => sendingNow.current.delete(id));
  }, [intentOf, items, state.slots, evidence]);

  const views = useMemo(() => liveViews(state), [state]);
  const answers = useMemo(() => liveAnswers(state), [state]);
  // the open item's send, the one the list draws Run for; each item sends on its own
  const sending = sel && state.slots[sel]?.phase === 'sending' ? sel : null;
  return { sel, select, intentOf, views, answers, sent: state.sent, sending, run, retry };
}

export type LiveActs = ReturnType<typeof useLiveActs>;
