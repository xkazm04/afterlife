'use client';

import { useCallback } from 'react';
import { useHostNav } from '@/components/shell/host';
import { reduce } from '../model/reducer';
import type { Step } from '../model/state';
import { stepTarget } from '../model/steps';
import type { MaturityApi } from './useMaturity';

/** The stage page of `stage`. */
export const stagePath = (stage: string): string => `/maturity/${encodeURIComponent(stage)}`;

/**
 * The stepper's go, now that the preview and the after-merge steps have no inspector: Preview and After merge open the
 * page of the stage whose gap they show; Pick and Send are the list's (from a stage page they go back to it). The screen
 * host draws the target in place. Returns whether the step was allowed (never, before the data is read).
 */
export function useStepNav(api: MaturityApi | null, from: 'list' | 'page') {
  const { navigate } = useHostNav();
  return useCallback(
    (k: Step): boolean => {
      if (!api || !api.go(k)) return false;
      const target = stepTarget(reduce(api.state, { type: 'go', step: k }, api.ctx), k);
      if (target) navigate(stagePath(target));
      else if (from === 'page') navigate('/maturity');
      return true;
    },
    [api, navigate, from],
  );
}
