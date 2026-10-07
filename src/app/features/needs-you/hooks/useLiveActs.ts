'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { NeedsYouItem } from '@/lib/demo';
import { NO_ANSWER, outcomeOf, type WriteView } from '@/server/actions/words';
import { liveIntent, noAnswer, writeName, type LiveAnswer } from '../model/live';
import { askPolicyMr, sendPolicyMr } from '../write/promote';

/**
 * The live list's writes. Selecting a promotion or a re-admit asks the server for its exact write (previewAction, nothing
 * runs); Run confirms the preview on screen by its id (confirmAction), never anything else. The answer is kept as the
 * response worded it: done names the MR GitLab opened, changed puts the new write on screen, refused and failed say so.
 */
const still = () => () => {};
const itemParam = () => new URLSearchParams(window.location.search).get('item');

export function useLiveActs(items: readonly NeedsYouItem[], project: string) {
  // `?item=<id>` opens that item selected (Ladder's p on an eligible class), when it is listed, until a click picks another
  const wanted = useSyncExternalStore(still, itemParam, () => null);
  const [picked, select] = useState<string | null | undefined>(undefined);
  const sel = picked !== undefined ? picked : wanted && items.some((n) => n.id === wanted) ? wanted : null;
  const [views, setViews] = useState<Readonly<Record<string, WriteView>>>({});
  const [answers, setAnswers] = useState<Readonly<Record<string, LiveAnswer>>>({});
  const [sending, setSending] = useState<string | null>(null);
  const asked = useRef(new Set<string>());

  const intentOf = useCallback((id: string) => {
    const item = items.find((n) => n.id === id);
    return item ? liveIntent(item, project) : null;
  }, [items, project]);

  const ask = useCallback((id: string) => {
    const intent = intentOf(id);
    if (!intent) return;
    asked.current.add(id);
    void askPolicyMr(intent).then((v) => setViews((m) => ({ ...m, [id]: v })));
  }, [intentOf]);

  useEffect(() => {
    if (sel && !asked.current.has(sel)) ask(sel);
  }, [sel, ask]);

  /** A preview that failed: ask again. */
  const retry = useCallback((id: string) => {
    setViews((m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== id)));
    ask(id);
  }, [ask]);

  const run = useCallback((id: string) => {
    const intent = intentOf(id);
    const view = views[id];
    if (!intent || view?.kind !== 'preview' || sending) return;
    setSending(id);
    sendPolicyMr(intent, view)
      .then((r) => {
        const o = r && outcomeOf(r, writeName(intent));
        if (!o) return;
        setAnswers((m) => ({ ...m, [id]: { status: o.status, text: o.text } }));
        if (o.status === 'changed') setViews((m) => ({ ...m, [id]: { kind: 'preview', preview: o.preview } }));
        else if (o.status === 'refused') setViews((m) => ({ ...m, [id]: { kind: 'refused', reason: o.reason } }));
      }, () => setAnswers((m) => ({ ...m, [id]: noAnswer(NO_ANSWER) })))
      .finally(() => setSending(null));
  }, [intentOf, views, sending]);

  return { sel, select, intentOf, views, answers, sending, run, retry };
}
