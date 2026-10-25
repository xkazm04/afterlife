'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { startRunAction } from '@/server/actions/runs/start/startRunAction';
import type { StartRun } from '@/server/actions/runs/start/types';
import { noAnswerOf, outcomeOf, unreachable, viewOf, type WriteView } from '@/server/actions/words';

export interface StartRound {
  /** The server's preview of exactly this intent, or why there is none; undefined until asked (or the form moved on). */
  view?: WriteView;
  asking: boolean;
  sending: boolean;
  outcome?: string;
  /** The run started (its pid is in the outcome): Start run stays off for this intent. */
  started: boolean;
  ask: () => void;
  send: () => void;
}

/** The address the screen goes to once a run started: the live film, which polls /api/runs. */
export const LIVE_HREF = '/theater?live=1';

/**
 * One start-run round trip: Preview asks startRunAction(intent) for the exact command; Start run confirms exactly that
 * preview (startRunAction(intent, previewId)). An answer is kept with the intent it answers, so a form that moved on
 * reads as unasked. A done start goes to the live film; a changed one shows the new preview to start again.
 */
export function useStartRun(intent: StartRun | null): StartRound {
  const router = useRouter();
  const key = intent ? JSON.stringify(intent) : '';
  const [got, setGot] = useState<{ key: string; view: WriteView } | null>(null);
  const [sent, setSent] = useState<{ key: string; outcome: string; started: boolean } | null>(null);
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const view = key && got?.key === key ? got.view : undefined;
  const outcome = key && sent?.key === key ? sent.outcome : undefined;
  const started = Boolean(key) && sent?.key === key && sent.started;

  const ask = useCallback(() => {
    if (!key || asking) return;
    setAsking(true);
    startRunAction(JSON.parse(key))
      .then((r) => setGot({ key, view: viewOf(r) }), (e: unknown) => setGot({ key, view: unreachable(e) }))
      .finally(() => setAsking(false));
  }, [key, asking]);

  const send = useCallback(() => {
    if (!key || view?.kind !== 'preview' || sending) return;
    setSending(true);
    startRunAction(JSON.parse(key), view.preview.previewId)
      .then((r) => {
        const o = outcomeOf(r, `start ${view.preview.title}`);
        setSent({ key, outcome: o?.status === 'done' ? `Started · ${view.preview.title} · ${o.made.join(' · ')}` : (o?.text ?? ''), started: o?.status === 'done' });
        if (o?.status === 'changed') setGot({ key, view: { kind: 'preview', preview: o.preview } });
        if (o?.status === 'refused' || o?.status === 'failed') setGot({ key, view: { kind: 'refused', reason: o.text } });
        if (o?.status === 'done') router.push(LIVE_HREF);
      }, (e: unknown) => setSent({ key, outcome: noAnswerOf(e), started: false }))
      .finally(() => setSending(false));
  }, [key, view, sending, router]);

  return { view, asking, sending, outcome, started, ask, send };
}
