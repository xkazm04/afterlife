'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WriteView } from '@/server/actions/words';
import { gapSend, type DataMode } from '../write/gap';
import { ask, readyRows, sendReady, toAsk, type GapAnswer, type SheetRow } from '../write/sheet';
import type { Gap } from '../model/ctx';

export interface GapSheetApi {
  rows: readonly SheetRow[];
  /** How many writes the button would confirm. */
  ready: number;
  sending: boolean;
  /** The gaps the server opened an MR for, with the MR it named (null when it named none). */
  opened: Readonly<Record<string, string | null>>;
  send: () => void;
  retry: (id: string) => void;
}

/**
 * The Send sheet's writes. When the sheet opens on the picked gaps, each sendable gap's write is asked for (previewAction,
 * nothing runs); the button confirms the ones on screen by their preview ids. Nothing here moves a rung: the next scan does.
 */
export function useGapSheet(gaps: readonly Gap[], open: boolean, project: string, mode: DataMode): GapSheetApi {
  const [views, setViews] = useState<Readonly<Record<string, WriteView>>>({});
  const [answers, setAnswers] = useState<Readonly<Record<string, GapAnswer>>>({});
  const [sending, setSending] = useState(false);
  const asked = useRef(new Set<string>());
  const rows = useMemo<SheetRow[]>(
    () => gaps.map((g) => ({ id: g.id, title: g.title, send: gapSend(project, g, mode), view: views[g.id], answer: answers[g.id] })),
    [gaps, project, mode, views, answers],
  );

  const askRow = useCallback((row: SheetRow) => {
    asked.current.add(row.id);
    void ask(row).then((v) => setViews((m) => ({ ...m, [row.id]: v })));
  }, []);
  useEffect(() => {
    if (open) for (const row of toAsk(rows)) if (!asked.current.has(row.id)) askRow(row);
  }, [open, rows, askRow]);

  // A sheet that closed forgets what it asked: the files may have moved before it opens again.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setViews({});
      setAnswers({});
    }
  }
  useEffect(() => {
    if (!open) asked.current.clear();
  }, [open]);

  const retry = useCallback((id: string) => {
    setViews((m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== id)));
    asked.current.delete(id);
  }, []);

  const send = useCallback(() => {
    if (sending) return;
    setSending(true);
    void sendReady(rows)
      .then((sent) => {
        setAnswers((m) => ({ ...m, ...Object.fromEntries(sent.map((s) => [s.id, s.answer])) }));
        setViews((m) => ({ ...m, ...Object.fromEntries(sent.flatMap((s) => (s.view ? [[s.id, s.view]] : []))) }));
      })
      .finally(() => setSending(false));
  }, [rows, sending]);

  const opened = useMemo(() => Object.fromEntries(rows.filter((r) => r.answer?.status === 'done').map((r) => [r.id, r.answer?.mr ?? null])), [rows]);
  return { rows, ready: readyRows(rows).length, sending, opened, send, retry };
}
