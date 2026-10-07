'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { NO_ANSWER } from '@/server/actions/words';
import type { NeedsYouDemo } from '../data/types';
import { isPolicyKey, POLICY_KEYS } from '../model/outbox/policy';
import { reduce } from '../model/reducer';
import { isGapId } from '../model/rows/rowState';
import { initialState } from '../model/state';
import type { Action, NeedsState } from '../model/types';
import { askDesk, deskIntent, sendDesk } from '../write/desk';

/**
 * The screen state: one reducer, with each notice it produces shown once as a toast or a status-bar message. A policy-MR
 * decision (n1, n4) and a gap MR (g1..) are the server's: the exact write is asked for as soon as it is selected or staged
 * (previewAction), and Run is confirmAction with that preview's id. The reducer records only what the server answered.
 */
export function useNeedsYou(demo: NeedsYouDemo): { s: NeedsState; dispatch: (a: Action) => void } {
  const { toast, status } = useToast();
  const reducer = useCallback((s: NeedsState, a: Action) => reduce(s, a, demo), [demo]);
  const [s, dispatchRaw] = useReducer(reducer, demo, initialState);
  const asked = useRef(new Set<string>());
  const sending = useRef(new Set<string>());
  const { notice } = s;
  useEffect(() => {
    if (!notice) return;
    (notice.channel === 'toast' ? toast : status)(notice.text);
  }, [notice, toast, status]);

  // "When the action opens": selected in the table or staged in the outbox.
  const inView = [
    ...POLICY_KEYS.filter((k) => s.sel === k || s.status[k] === 'staged'),
    ...demo.gaps.map((g) => g.id).filter((id) => s.sel === id || s.gapStatus[id] === 'staged'),
  ].join(',');
  useEffect(() => {
    for (const key of inView.split(',')) {
      const intent = key ? deskIntent(key, demo) : null; // a gap with no door (the probe) asks for nothing
      if (!intent || asked.current.has(key)) continue;
      asked.current.add(key);
      void askDesk(intent).then((view) => dispatchRaw({ type: 'write', key, view }));
    }
  }, [inView, demo]);

  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const run = useCallback(
    (key: string) => {
      const view = latest.current.writes[key];
      const intent = deskIntent(key, demo);
      if (!intent || view?.kind !== 'preview') return status('Nothing sent · the exact write is not on screen yet');
      if (sending.current.has(key)) return status('Already sending this write');
      sending.current.add(key);
      status('Sending…');
      sendDesk(intent, view)
        .then((response) => response && dispatchRaw({ type: 'ran', key, response }), () => toast(NO_ANSWER))
        .finally(() => sending.current.delete(key));
    },
    [demo, status, toast],
  );
  const dispatch = useCallback((a: Action) => (a.type === 'run' && (isPolicyKey(a.key) || isGapId(a.key)) ? run(a.key) : dispatchRaw(a)), [run]);
  return useMemo(() => ({ s, dispatch }), [s, dispatch]);
}
