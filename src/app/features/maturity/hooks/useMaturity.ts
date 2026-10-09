'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { DemoData } from '@/lib/demo';
import type { Stage } from '@/schemas';
import { makeCtx, type MaturityCtx } from '../model/ctx';
import { reduce, type Action } from '../model/reducer';
import { initialState, pendingIds, type MaturityState, type Step } from '../model/state';
import { stepsView, type StepView } from '../model/steps';
import { routeViews, type RouteView } from '../model/crag/routes';
import type { Mode } from '../model/rungs';
import type { DataMode } from '../write/gap';

export interface MaturityApi {
  ctx: MaturityCtx;
  state: MaturityState;
  dispatch: (a: Action) => void;
  routes: RouteView[];
  steps: StepView[];
  pending: string[];
  /** Go to a step; returns whether it was allowed (the step has what it needs). */
  go: (k: Step) => boolean;
  select: (stage: Stage) => void;
  setMode: (m: Mode) => void;
}

/** The Maturity screen's state: the pure reducer, its derived views, and the toast for each notice it raises. */
export function useMaturity(maturity: DemoData['maturity'], stages: readonly Stage[], mode: DataMode = 'demo'): MaturityApi {
  const ctx = useMemo(() => makeCtx(maturity, stages, { mode }), [maturity, stages, mode]);
  const [state, dispatch] = useReducer((s: MaturityState, a: Action) => reduce(s, a, ctx), ctx, initialState);
  const { toast, status } = useToast();

  useEffect(() => {
    if (!state.notice) return;
    toast(state.notice.text);
    status(ctx.nowClock ? `${ctx.nowClock} · ${state.notice.text}` : state.notice.text);
  }, [state.notice, toast, status, ctx.nowClock]);

  const routes = useMemo(() => routeViews(state, ctx), [state, ctx]);
  const steps = useMemo(() => stepsView(state, ctx), [state, ctx]);
  const pending = useMemo(() => pendingIds(state, ctx), [state, ctx]);

  const go = useCallback(
    (k: Step) => {
      const allowed = reduce(state, { type: 'go', step: k }, ctx).step === k;
      if (allowed) dispatch({ type: 'go', step: k });
      return allowed;
    },
    [state, ctx],
  );
  const select = useCallback((stage: Stage) => dispatch({ type: 'select', stage }), []);
  const setMode = useCallback((mode: Mode) => dispatch({ type: 'mode', mode }), []);

  return { ctx, state, dispatch, routes, steps, pending, go, select, setMode };
}
