'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { ask, readyRows, sendRow, sheetRows, toAsk, type SheetRow } from '../write/sheet';
import type { MaturityApi } from './useMaturity';
import type { DataMode } from '../write/gap';

export interface GapSheetApi {
  rows: readonly SheetRow[];
  /** How many writes the button would confirm. */
  ready: number;
  sending: boolean;
  send: () => void;
  retry: (id: string) => void;
}

/**
 * The Send sheet's two server calls. Everything they learn goes to the layout's reducer (model/flow/send.ts): when the sheet
 * opens each sendable gap's write is asked for (previewAction, nothing runs) and its view dispatched; the button confirms the
 * ones on screen by their preview ids and dispatches each answer as it arrives, so an answer reaches the state even if this
 * screen is gone by then. Nothing here holds state or moves a rung: the next scan does.
 */
export function useGapSheet({ ctx, state, dispatch }: Pick<MaturityApi, 'ctx' | 'state' | 'dispatch'>, project: string, mode: DataMode): GapSheetApi {
  const rows = useMemo(() => sheetRows(state, ctx, project, mode), [state, ctx, project, mode]);

  useEffect(() => {
    if (!state.sheet) return;
    const asking = toAsk(rows);
    if (!asking.length) return;
    dispatch({ type: 'ask', ids: asking.map((r) => r.id) });
    for (const row of asking) void ask(row).then((view) => dispatch({ type: 'viewed', id: row.id, view }));
  }, [state.sheet, rows, dispatch]);

  const sending = rows.some((r) => r.phase === 'sending');
  const send = useCallback(() => {
    const ready = readyRows(rows);
    if (sending || !ready.length) return;
    dispatch({ type: 'sending', ids: ready.map((r) => r.id) });
    for (const row of ready) void sendRow(row).then((s) => dispatch({ type: 'answered', id: s.id, answer: s.answer, ...(s.view ? { view: s.view } : {}) }));
  }, [rows, sending, dispatch]);
  const retry = useCallback((id: string) => dispatch({ type: 'retry', id }), [dispatch]);

  return { rows, ready: readyRows(rows).length, sending, send, retry };
}
