'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { NeedsYouDemo } from '../data/types';
import { reduce } from '../model/reducer';
import { initialState } from '../model/state';
import type { Action, NeedsState } from '../model/types';

/** The screen state: one reducer, with each notice it produces shown once as a toast or a status-bar message. */
export function useNeedsYou(demo: NeedsYouDemo): { s: NeedsState; dispatch: (a: Action) => void } {
  const { toast, status } = useToast();
  const reducer = useCallback((s: NeedsState, a: Action) => reduce(s, a, demo), [demo]);
  const [s, dispatch] = useReducer(reducer, demo, initialState);
  const { notice } = s;
  useEffect(() => {
    if (!notice) return;
    (notice.channel === 'toast' ? toast : status)(notice.text);
  }, [notice, toast, status]);
  return useMemo(() => ({ s, dispatch }), [s]);
}
