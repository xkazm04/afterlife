'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { NeedsYouDemo } from '../data/types';
import { isPolicyKey } from '../model/outbox/policy';
import { reduce } from '../model/reducer';
import { isGapId } from '../model/rows/rowState';
import { keysToAsk } from '../model/run';
import { beginSend } from '../model/slot/slot';
import { initialState } from '../model/state';
import type { Action, NeedsState } from '../model/types';
import { askDesk, deskIntent, sendDesk } from '../write/desk';

/**
 * The screen state: one reducer, with each notice it produces shown once as a toast or a status-bar message. A policy-MR
 * decision (n1, n4) and a gap MR (g1..) are the server's: the exact write is asked for as soon as it is selected or staged
 * (previewAction), and Run is confirmAction with that preview's id, once (the slot's beginSend). The reducer records only what
 * the server answered; a confirm with no answer closes Run until the write is asked for again.
 */
export function useNeedsYou(demo: NeedsYouDemo): { s: NeedsState; dispatch: (a: Action) => void } {
  const { toast, status } = useToast();
  const reducer = useCallback((s: NeedsState, a: Action) => reduce(s, a, demo), [demo]);
  const [s, dispatchRaw] = useReducer(reducer, demo, initialState);
  const sending = useRef(new Set<string>()); // in flight, before the 'sending' render lands
  const { notice } = s;
  useEffect(() => {
    if (!notice) return;
    (notice.channel === 'toast' ? toast : status)(notice.text);
  }, [notice, toast, status]);

  // "When the action opens": selected in the table or staged in the outbox; asked again after a refusal or no answer.
  const toAsk = keysToAsk(s, demo).join(',');
  const asking = useRef(new Set<string>()); // in flight only: whether to ask is the slots' (keysToAsk)
  useEffect(() => {
    for (const key of toAsk.split(',')) {
      const intent = key ? deskIntent(key, demo) : null;
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
      const intent = deskIntent(key, demo);
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
  const dispatch = useCallback((a: Action) => (a.type === 'run' && (isPolicyKey(a.key) || isGapId(a.key)) ? run(a.key) : dispatchRaw(a)), [run]);
  return useMemo(() => ({ s, dispatch }), [s, dispatch]);
}
