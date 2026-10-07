'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { NO_ANSWER } from '@/server/actions/words';
import type { NeedsYouDemo } from '../data/types';
import { isPolicyKey, POLICY_KEYS } from '../model/outbox/policy';
import { reduce } from '../model/reducer';
import { initialState } from '../model/state';
import type { Action, NeedsState, PolicyKey } from '../model/types';
import { askPolicyMr, policyIntent, sendPolicyMr } from '../write/promote';

/**
 * The screen state: one reducer, with each notice it produces shown once as a toast or a status-bar message. A policy-MR
 * decision (n1, n4) is the server's: its exact write is asked for as soon as it is selected or staged (previewAction),
 * and its Run is confirmAction with that preview's id. The reducer records only what the server answered.
 */
export function useNeedsYou(demo: NeedsYouDemo): { s: NeedsState; dispatch: (a: Action) => void } {
  const { toast, status } = useToast();
  const reducer = useCallback((s: NeedsState, a: Action) => reduce(s, a, demo), [demo]);
  const [s, dispatchRaw] = useReducer(reducer, demo, initialState);
  const asked = useRef(new Set<PolicyKey>());
  const sending = useRef(new Set<PolicyKey>());
  const { notice } = s;
  useEffect(() => {
    if (!notice) return;
    (notice.channel === 'toast' ? toast : status)(notice.text);
  }, [notice, toast, status]);

  // "When the action opens": selected in the table or staged in the outbox.
  const inView = POLICY_KEYS.filter((k) => s.sel === k || s.status[k] === 'staged').join(',');
  useEffect(() => {
    for (const key of inView.split(',').filter(isPolicyKey)) {
      if (asked.current.has(key)) continue;
      asked.current.add(key);
      void askPolicyMr(policyIntent(key, demo)).then((view) => dispatchRaw({ type: 'write', key, view }));
    }
  }, [inView, demo]);

  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const run = useCallback(
    (key: PolicyKey) => {
      const view = latest.current.writes[key];
      if (view?.kind !== 'preview') return status('Nothing sent · the exact write is not on screen yet');
      if (sending.current.has(key)) return status('Already sending this write');
      sending.current.add(key);
      status('Sending…');
      sendPolicyMr(policyIntent(key, demo), view)
        .then((response) => response && dispatchRaw({ type: 'ran', key, response }), () => toast(NO_ANSWER))
        .finally(() => sending.current.delete(key));
    },
    [demo, status, toast],
  );
  const dispatch = useCallback((a: Action) => (a.type === 'run' && isPolicyKey(a.key) ? run(a.key) : dispatchRaw(a)), [run]);
  return useMemo(() => ({ s, dispatch }), [s, dispatch]);
}
