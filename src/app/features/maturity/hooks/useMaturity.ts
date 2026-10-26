'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { DemoData } from '@/lib/demo';
import type { Stage } from '@/schemas';
import { arrive } from '../model/session/arrive';
import { makeCtx, type MaturityCtx } from '../model/ctx';
import { reduce, type Action } from '../model/reducer';
import { pendingIds, statusLine, type MaturityState, type Step } from '../model/state';
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

/** What the screens are read from (the screen host's core slice): the dataset, and the data source's project and mode. */
export interface MaturityInput {
  maturity: DemoData['maturity'];
  stages: readonly Stage[];
  project: string;
  mode: DataMode;
}

type Inner = Action | { type: 'arrived'; ctx: MaturityCtx; before: MaturityCtx | null };

/**
 * The Maturity screens' state: the pure reducer, its derived views, and the toast for each notice it raises. Null until
 * the data is read (`input` null): the screens draw their frame with dashes. Each new read merges in (model/arrive.ts),
 * never wiping what the person did.
 */
export function useMaturity(input: MaturityInput | null): MaturityApi | null {
  const maturity = input?.maturity;
  const stages = input?.stages;
  const mode = input?.mode ?? 'demo';
  const ctx = useMemo(() => (maturity && stages ? makeCtx(maturity, stages, { mode }) : null), [maturity, stages, mode]);
  const [state, dispatch] = useReducer(
    (s: MaturityState | null, a: Inner): MaturityState | null => (a.type === 'arrived' ? arrive(s, a.ctx, a.before) : s && ctx ? reduce(s, a, ctx) : s),
    ctx,
    (c: MaturityCtx | null) => (c ? arrive(null, c, null) : null),
  );
  // a new read: merged in during this render (React's "adjust state when a prop changes"), so no frame shows the old ctx
  const [seen, setSeen] = useState(ctx);
  if (seen !== ctx) {
    setSeen(ctx);
    if (ctx) dispatch({ type: 'arrived', ctx, before: seen });
  }
  const { toast, status } = useToast();

  // Keyed on the clock, not ctx: a new ctx (a mode change) must not raise the last notice again.
  const nowClock = ctx?.nowClock ?? null;
  const notice = state?.notice;
  useEffect(() => {
    if (!notice) return;
    toast(notice.text);
    status(statusLine({ nowClock }, notice.text));
  }, [notice, toast, status, nowClock]);

  const go = useCallback(
    (k: Step) => {
      if (!state || !ctx) return false;
      const allowed = reduce(state, { type: 'go', step: k }, ctx).step === k;
      if (allowed) dispatch({ type: 'go', step: k });
      return allowed;
    },
    [state, ctx],
  );
  const select = useCallback((stage: Stage) => dispatch({ type: 'select', stage }), []);
  const setMode = useCallback((mode: Mode) => dispatch({ type: 'mode', mode }), []);

  return useMemo(() => {
    if (!state || !ctx || seen !== ctx) return null;
    return { ctx, state, dispatch, routes: routeViews(state, ctx), steps: stepsView(state, ctx), pending: pendingIds(state, ctx), go, select, setMode };
  }, [state, ctx, seen, go, select, setMode]);
}
