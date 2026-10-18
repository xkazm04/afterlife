'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { ask, readyRows, sendRow, sheetRows, toAsk, type SheetRow } from '../write/sheet';
import type { MaturityApi } from './useMaturity';
import type { DataMode } from '../write/gap';
import type { WriteView } from '@/server/actions/words';

export interface GapSheetApi {
  rows: readonly SheetRow[];
  /** How many writes the button would confirm. */
  ready: number;
  sending: boolean;
  send: () => void;
  retry: (id: string) => void;
}

/** Asks for a row's write and hands the answer on, unless the sheet closed since: a closed sheet forgets what it asked. */
export function createAsker(askRow: (row: SheetRow) => Promise<WriteView>, put: (id: string, view: WriteView) => void) {
  let generation = 0;
  return {
    ask(row: SheetRow): void {
      const mine = generation;
      void askRow(row).then((v) => {
        if (mine === generation) put(row.id, v);
      });
    },
    /** Answers still in flight are dropped when they land. */
    close(): void {
      generation += 1;
    },
  };
}

/**
 * The Send sheet's two server calls. Everything they learn goes to the layout's reducer (model/flow/send.ts): when the sheet
 * opens each sendable gap's write is asked for (previewAction, nothing runs) and its view dispatched; the button confirms the
 * ones on screen by their preview ids and dispatches each answer as it arrives, so an answer reaches the state even if this
 * screen is gone by then. Nothing here holds state or moves a rung: the next scan does.
 */
export function useGapSheet({ ctx, state, dispatch }: Pick<MaturityApi, 'ctx' | 'state' | 'dispatch'>, project: string, mode: DataMode): GapSheetApi {
  const rows = useMemo(() => sheetRows(state, ctx, project, mode), [state, ctx, project, mode]);

  // One asker per sheet's life: closing it drops the answers still in flight, so a quick reopen never takes an old preview.
  const asker = useMemo(() => createAsker(ask, (id, view) => dispatch({ type: 'viewed', id, view })), [dispatch]);
  useEffect(() => {
    if (!state.sheet) return asker.close();
    const asking = toAsk(rows);
    if (!asking.length) return;
    dispatch({ type: 'ask', ids: asking.map((r) => r.id) });
    for (const row of asking) asker.ask(row);
  }, [state.sheet, rows, dispatch, asker]);

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
