'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { recallAction } from '@/server/actions/runs/recallAction';
import type { WriteView } from '@/server/actions/words';
import type { DeskItem } from '../model/desk';
import type { LiveEvidence } from '../model/evidence/evidence';
import { LIVE_EMPTY, liveAnswers, liveReduce, liveViews, outResult, type OutAnswer } from '../model/slot/liveActs';
import { beginSend, canRun, needsAsk, needsRecall } from '../model/slot/slot';
import { askLive, liveWriteName, sendLive } from '../write/live';

/**
 * The live desk's writes. A row in view (selected or staged) with a write asks the server for it (previewAction, nothing
 * runs); Run confirms the preview on screen by its id (confirmAction), never anything else. Each row is one write slot
 * (model/slot, the desk's rule) in a pure reducer (model/slot/liveActs.ts): this hook only asks and confirms. Changed puts
 * the new write on screen, refused and failed say so, done names the MR, and no answer closes Run until it is asked again:
 * Ask again then first asks the server what that preview did (recallAction), and only asks afresh when it cannot say.
 * A row whose class moved since the proposal (its evidence's canRun is false) is never sent, from a click, a key or Run all.
 */
const NONE: Readonly<Record<string, LiveEvidence>> = {};
const CLOSED = 'Closed: the class moved since this was proposed. Nothing ran.';

export function useLiveActs(rows: readonly DeskItem[], inView: readonly string[], evidence: Readonly<Record<string, LiveEvidence>> = NONE) {
  const [state, dispatch] = useReducer(liveReduce, LIVE_EMPTY);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  const asking = useRef(new Set<string>()); // in flight only: whether to ask is the slot's (needsAsk)
  const sendingNow = useRef(new Set<string>()); // in flight, before the 'sending' render lands

  const rowOf = useCallback((id: string) => rows.find((n) => n.id === id), [rows]);
  const closed = useCallback((id: string) => {
    const ev = evidence[id];
    return ev?.kind === 'class' && !ev.canRun;
  }, [evidence]);

  const ask = useCallback((id: string): Promise<WriteView> | null => {
    const intent = rowOf(id)?.intent;
    if (!intent || asking.current.has(id)) return null;
    asking.current.add(id);
    return askLive(intent).then((view) => {
      asking.current.delete(id);
      dispatch({ type: 'viewed', id, view });
      return view;
    });
  }, [rowOf]);

  const toAsk = inView.filter((id) => rowOf(id)?.intent && needsAsk(state.slots[id])).join('\n');
  useEffect(() => {
    for (const id of toAsk ? toAsk.split('\n') : []) void ask(id);
  }, [toAsk, ask]);

  /** A preview that failed, or a confirm that got no answer: ask again (an unsure one asks what its preview did first). */
  const recalling = useRef(new Set<string>());
  const retry = useCallback((id: string) => {
    const slot = state.slots[id];
    if (!needsRecall(slot) || slot?.view?.kind !== 'preview') return dispatch({ type: 'retry', id });
    if (recalling.current.has(id)) return;
    recalling.current.add(id);
    const row = rowOf(id);
    const what = row?.intent ? liveWriteName(row.intent) : undefined;
    recallAction(slot.view.preview.previewId)
      .catch(() => ({ kind: 'unknown' as const }))
      .then((recall) => dispatch({ type: 'recalled', id, item: row?.source ?? undefined, recall, ...(what ? { what } : {}) }))
      .finally(() => recalling.current.delete(id));
  }, [state.slots, rowOf]);

  /** One confirm of `view`, the preview on screen; its answer as the outbox records it. */
  const send = useCallback(async (id: string, view: WriteView): Promise<OutAnswer> => {
    const row = rowOf(id);
    const what = row?.intent ? liveWriteName(row.intent) : id;
    sendingNow.current.add(id);
    dispatch({ type: 'sending', id });
    const response = row?.intent ? await sendLive(row.intent, view).catch(() => null) : null;
    sendingNow.current.delete(id);
    dispatch({ type: 'ran', id, item: row?.source ?? undefined, response, what });
    return outResult(response, what);
  }, [rowOf]);

  /** Run on one row: confirms its preview on screen; null when Run is not open (nothing is sent). */
  const run = useCallback((id: string): Promise<OutAnswer> | null => {
    const slot = state.slots[id];
    if (!rowOf(id)?.intent || !beginSend(slot) || sendingNow.current.has(id) || closed(id) || slot?.view?.kind !== 'preview') return null;
    return send(id, slot.view);
  }, [state.slots, rowOf, closed, send]);

  /**
   * Run all, one row: confirm its current preview, asking for one first when there is none (or it was refused). An unsure
   * or sending row is never sent again from here, and a done one is not sent twice.
   */
  const confirmNow = useCallback(async (id: string): Promise<OutAnswer> => {
    const row = rowOf(id);
    const what = row?.intent ? liveWriteName(row.intent) : id;
    if (!row?.intent) return { state: 'refused', text: `Refused · ${what} · this row has no write here. Nothing ran.` };
    if (closed(id)) return { state: 'refused', text: CLOSED };
    const slot = latest.current.slots[id];
    if (slot?.phase === 'answered') return { state: 'done', text: slot.answer?.text ?? what };
    if (slot?.phase === 'sending' || slot?.phase === 'unsure' || sendingNow.current.has(id)) {
      return { state: 'failed', text: slot?.answer?.text ?? `Not sent · ${what} · a send of it is already out.` };
    }
    let view = canRun(slot) ? slot?.view : undefined;
    if (!view) {
      if (slot?.phase === 'refused') dispatch({ type: 'retry', id });
      // an ask already in flight for this row: ask once more for this run (a preview runs nothing)
      view = await (ask(id) ?? askLive(row.intent).then((v) => {
        dispatch({ type: 'viewed', id, view: v });
        return v;
      }));
    }
    if (view?.kind !== 'preview') return { state: 'refused', text: `Refused · ${what} · ${view?.reason ?? 'no write'}. Nothing ran.` };
    return send(id, view);
  }, [rowOf, closed, ask, send]);

  const views = useMemo(() => liveViews(state), [state]);
  const answers = useMemo(() => liveAnswers(state), [state]);
  const sending = useMemo(() => Object.keys(state.slots).filter((id) => state.slots[id]?.phase === 'sending'), [state]);
  return { views, answers, sent: state.sent, sending, run, retry, confirmNow };
}

export type LiveActs = ReturnType<typeof useLiveActs>;
