'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { Recall } from '@/server/actions/runs/journal';
import { recallAction } from '@/server/actions/runs/recallAction';
import type { NeedsYouDemo } from '../data/types';
import { isPolicyKey } from '../model/outbox/policy';
import { reduce } from '../model/reducer';
import { isGapId } from '../model/rows/rowState';
import { keysToAsk, recalledItem } from '../model/run';
import { beginSend, needsRecall } from '../model/slot/slot';
import { arriveDemo } from '../model/session/arrive';
import { initialState } from '../model/state';
import type { Action, NeedsState } from '../model/types';
import { askDesk, deskIntent, sendDesk } from '../write/desk';

/**
 * The screen state: one reducer, with each notice it produces shown once as a toast or a status-bar message. A policy-MR
 * decision (n1, n4) and a gap MR (g1..) are the server's: the exact write is asked for as soon as it is selected or staged
 * (previewAction), and Run is confirmAction with that preview's id, once (the slot's beginSend). The reducer records only what
 * the server answered; a confirm with no answer closes Run until the write is asked for again, and Ask again on it first
 * asks the server what its preview did (recallAction, the hook's own 'recalled' step: model/run.ts recalledItem).
 */
/** The hook's own steps: what the server recorded for an unsure write's preview (recalledItem); the desk read landing. */
type Recalled = { type: 'recalled'; key: string; recall: Recall } | { type: 'arrived'; demo: NeedsYouDemo };

const NO_GAPS = { gaps: [] } as unknown as NeedsYouDemo;

/**
 * `demo` null: the desk is not read yet (the screen host's Session mounts the store first). The state opens then and
 * every action waits for the desk; its arrival merges in (model/session/arrive.ts), never wiping what was done.
 */
export function useNeedsYou(demo: NeedsYouDemo | null): { s: NeedsState; dispatch: (a: Action) => void } {
  const { toast, status } = useToast();
  const reducer = useCallback(
    (s: NeedsState, a: Action | Recalled) => {
      if (a.type === 'arrived') return arriveDemo(s, a.demo);
      if (!demo) return s;
      return a.type === 'recalled' ? recalledItem(s, a.key, a.recall, demo) : reduce(s, a, demo);
    },
    [demo],
  );
  const [s, dispatchRaw] = useReducer(reducer, demo ?? NO_GAPS, initialState);
  // the desk read landed (or another one did): merged during this render, so no frame shows it unread
  const [seen, setSeen] = useState(demo);
  if (seen !== demo) {
    setSeen(demo);
    if (demo) dispatchRaw({ type: 'arrived', demo });
  }
  const sending = useRef(new Set<string>()); // in flight, before the 'sending' render lands
  const { notice } = s;
  useEffect(() => {
    if (!notice) return;
    (notice.channel === 'toast' ? toast : status)(notice.text);
  }, [notice, toast, status]);

  // "When the action opens": selected in the table or staged in the outbox; asked again after a refusal or no answer.
  const toAsk = demo ? keysToAsk(s, demo).join(',') : '';
  const asking = useRef(new Set<string>()); // in flight only: whether to ask is the slots' (keysToAsk)
  useEffect(() => {
    for (const key of toAsk.split(',')) {
      const intent = key && demo ? deskIntent(key, demo) : null;
      if (!intent || asking.current.has(key)) continue;
      asking.current.add(key);
      void askDesk(intent).then((view) => {
        asking.current.delete(key);
        dispatchRaw({ type: 'write', key, view });
      });
    }
  }, [toAsk, demo]);

  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const run = useCallback(
    (key: string) => {
      const slot = latest.current.slots?.[key];
      const intent = demo ? deskIntent(key, demo) : null;
      if (slot?.phase === 'sending' || sending.current.has(key)) return status('Already sending this write');
      if (!intent || !beginSend(slot)) return status('Nothing sent · there is no write on screen to run');
      sending.current.add(key);
      dispatchRaw({ type: 'sending', key });
      status('Sending…');
      // beginSend held a preview, so sendDesk confirms it; a throw is no answer: the write may or may not have run
      sendDesk(intent, slot?.view)
        .then((response) => dispatchRaw({ type: 'ran', key, response }), () => dispatchRaw({ type: 'ran', key, response: null }))
        .finally(() => sending.current.delete(key));
    },
    [demo, status],
  );
  const recalling = useRef(new Set<string>());
  const recall = useCallback((key: string) => {
    const view = latest.current.slots?.[key]?.view;
    if (view?.kind !== 'preview' || recalling.current.has(key)) return;
    recalling.current.add(key);
    status('Asking Afterlife whether it ran…');
    recallAction(view.preview.previewId)
      .catch((): Recall => ({ kind: 'unknown' }))
      .then((r) => dispatchRaw({ type: 'recalled', key, recall: r }))
      .finally(() => recalling.current.delete(key));
  }, [status]);
  const dispatch = useCallback((a: Action) => {
    if (a.type === 'retry' && needsRecall(latest.current.slots?.[a.key])) return recall(a.key);
    return a.type === 'run' && (isPolicyKey(a.key) || isGapId(a.key)) ? run(a.key) : dispatchRaw(a);
  }, [run, recall]);
  return useMemo(() => ({ s, dispatch }), [s, dispatch]);
}
