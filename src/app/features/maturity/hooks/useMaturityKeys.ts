'use client';

import { useEffect, useRef } from 'react';
import { useKeymap } from '@/lib/keyboard/keymap';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import type { MaturityCtx } from '../model/ctx';
import { MATURITY_KEYMAP, MATURITY_SHEET_KEYMAP, STEP_KEYS } from '../model/keys/keymap';
import { reduce } from '../model/reducer';
import type { MaturityState, Step } from '../model/state';
import type { MaturityApi } from './useMaturity';

type FocusWhere = 'crag' | 'list' | null;

/** Whether an arrow press changes the selection: if not, no effect would clear the focus origin it armed. */
export function movesSelection(state: MaturityState, ctx: MaturityCtx, dir: 1 | -1): boolean {
  return reduce(state, { type: 'move', dir }, ctx).sel !== state.sel;
}

/** Focus the newly selected stage in the part the arrow key came from (the crag column or the sidebar row). */
function focusStage(where: FocusWhere, stage: string, index: number) {
  if (where === 'crag') document.querySelector<HTMLElement>(`[data-crag] [data-stage="${stage}"]`)?.focus();
  if (where === 'list') (document.querySelector('[data-stagelist]')?.children[index] as HTMLElement | undefined)?.focus();
}

/**
 * Keyboard (model/keys/keymap.ts): ← → (or ↑ ↓) stage, or the picked gap while previewing · P pick · 1-4 steps · D N T crag · R rescan.
 * Off while the Send sheet is open, where Enter sends and Escape cancels (the Sheet handles Escape itself).
 */
export function useMaturityKeys(api: MaturityApi, onGo: (k: Step) => void, onSend: () => void) {
  const { state, ctx, dispatch, setMode } = api;
  const where = useRef<FocusWhere>(null);

  useEffect(() => {
    if (!where.current) return;
    focusStage(where.current, state.sel, ctx.stages.indexOf(state.sel));
    where.current = null;
  }, [state.sel, ctx.stages]);

  const arrow = (dir: 1 | -1) => (e: KeyboardEvent) => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest('[role="radiogroup"]')) return;
    const from = t?.closest('[data-crag]') ? 'crag' : t?.closest('[data-stagelist]') ? 'list' : null;
    where.current = from;
    if (!movesSelection(state, ctx, dir)) where.current = null;
    dispatch({ type: 'move', dir });
  };
  const pickSelected = () => {
    const g = ctx.gapByStage(state.sel);
    if (g) dispatch({ type: 'togglePick', id: g.id });
  };

  useHotkeys(
    useKeymap(MATURITY_KEYMAP, {
      move: [arrow(-1), arrow(1), arrow(-1), arrow(1)],
      go: STEP_KEYS.map((k) => () => onGo(k)),
      pick: pickSelected,
      mode: [() => setMode('day0'), () => setMode('now'), () => setMode('target')],
      rescan: () => dispatch({ type: 'rescanAll' }),
    }),
    !state.sheet,
  );

  // The sheet: Enter sends, unless a button has focus (then Enter clicks that button: Cancel or Send).
  useHotkeys(
    useKeymap(MATURITY_SHEET_KEYMAP, {
      send: (e) => {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        onSend();
      },
    }),
    state.sheet,
  );
}
