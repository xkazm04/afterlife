'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { TaskView } from '../model/types';
import {
  REPLAY_CLEAR_MS,
  REPLAY_DONE_STATUS,
  REPLAY_START,
  REPLAY_STEP_MS,
  ledgerRowAt,
  nextReplay,
  replayMessage,
  replayStartStatus,
  replayStepStatus,
  type ReplayState,
} from '../model/verdict/replay';

interface Run {
  taskId: string;
  rv: ReplayState;
  /** The ledger row lit while replaying (and for a moment after). */
  row: number | null;
}
const IDLE: Run = { taskId: '', rv: null, row: null };

/**
 * Replay the verdict from the ledger: claims first, then one check every step, the ledger rows lighting up as it goes.
 * Nothing is re-run. With reduced motion there is no animation: the result is announced at once. A replay belongs to one
 * task; opening another task ends it.
 */
export function useReplay(task: TaskView, opts: { onStart: () => void }) {
  const { toast, status } = useToast();
  const [run, setRun] = useState<Run>(IDLE);
  const live = run.taskId === task.id ? run : IDLE;
  const n = task.proof.checks.length;
  const rows = task.ledger.length;

  useEffect(() => {
    if (live.rv === null) return;
    const rv = live.rv;
    const timer = setTimeout(() => {
      const next = nextReplay(rv, n);
      if (next === null) {
        setRun({ taskId: task.id, rv: null, row: ledgerRowAt(n, n, rows) });
        status(REPLAY_DONE_STATUS);
        toast(replayMessage(task));
        return;
      }
      const row = ledgerRowAt(next, n, rows);
      setRun({ taskId: task.id, rv: next, row });
      status(replayStepStatus(task, row));
    }, REPLAY_STEP_MS);
    return () => clearTimeout(timer);
  }, [live.rv, n, rows, task, status, toast]);

  useEffect(() => {
    if (live.rv !== null || live.row === null) return;
    const timer = setTimeout(() => setRun(IDLE), REPLAY_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [live.rv, live.row]);

  const { onStart } = opts;
  const start = useCallback(() => {
    onStart();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRun(IDLE);
      toast(replayMessage(task));
      return;
    }
    setRun({ taskId: task.id, rv: REPLAY_START, row: null });
    status(replayStartStatus(task));
  }, [onStart, status, task, toast]);

  return { rv: live.rv, row: live.row, running: live.rv !== null, start };
}
