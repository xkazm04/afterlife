'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { reduce } from '../model/reducer';
import type { Step } from '../model/state';
import { stepTarget } from '../model/steps';
import type { MaturityApi } from './useMaturity';

/** The stage page of `stage`. */
export const stagePath = (stage: string): string => `/maturity/${encodeURIComponent(stage)}`;

/**
 * The stepper's go, now that the preview and the after-merge steps have no inspector: Preview and After merge open the
 * page of the stage whose gap they show; Pick and Send are the list's (from a stage page they go back to it).
 * Returns whether the step was allowed.
 */
export function useStepNav(api: MaturityApi, from: 'list' | 'page') {
  const router = useRouter();
  const { state, ctx, go } = api;
  return useCallback(
    (k: Step): boolean => {
      if (!go(k)) return false;
      const target = stepTarget(reduce(state, { type: 'go', step: k }, ctx), k);
      if (target) router.push(stagePath(target));
      else if (from === 'page') router.push('/maturity');
      return true;
    },
    [go, ctx, state, router, from],
  );
}
