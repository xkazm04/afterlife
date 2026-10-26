'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRevalidate } from '@/components/shell/host';
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ProjectIntent } from '@/server/actions/types';
import { noAnswerOf, outcomeOf, unreachable, viewOf, type WriteView } from '@/server/actions/words';

export interface ProjectWrite {
  /** The server's preview of the intent, or why there is none; undefined while it is asked for. */
  view?: WriteView;
  sending: boolean;
  /** What the confirm did, in words (outcomeOf); undefined until one answered. */
  outcome?: string;
  done: boolean;
  send: () => void;
}

/**
 * One project write's round trip (queue-runs, install-skill, enable-app-insights): previewAction as soon as the intent
 * is on screen, confirmAction of exactly that preview on the click. Nothing is spelled here: the commands are the
 * server's. A changed answer shows the new preview to send again; a done one re-reads the screen it is on (the host's
 * revalidate; outside the host, the route).
 */
export function useProjectWrite(intent: ProjectIntent | null, what: string): ProjectWrite {
  const revalidate = useRevalidate();
  const key = intent ? JSON.stringify(intent) : '';
  // Each answer is kept with the intent it answers, so a new intent reads as unasked without resetting state in an effect.
  const [got, setGot] = useState<{ key: string; view: WriteView } | null>(null);
  const [sent, setSent] = useState<{ key: string; outcome?: string; done: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const view = got?.key === key ? got.view : undefined;
  const outcome = sent?.key === key ? sent.outcome : undefined;
  const done = sent?.key === key && sent.done;

  useEffect(() => {
    if (!key) return;
    let live = true;
    previewAction(JSON.parse(key)).then(
      (r) => live && setGot({ key, view: viewOf(r) }),
      (e: unknown) => live && setGot({ key, view: unreachable(e) }),
    );
    return () => {
      live = false;
    };
  }, [key]);

  const send = useCallback(() => {
    if (!key || view?.kind !== 'preview' || sending) return;
    setSending(true);
    confirmAction(JSON.parse(key), view.preview.previewId)
      .then((r) => {
        const o = outcomeOf(r, what);
        setSent({ key, outcome: o?.text, done: o?.status === 'done' });
        if (o?.status === 'changed') setGot({ key, view: { kind: 'preview', preview: o.preview } });
        if (o?.status === 'refused' || o?.status === 'failed') setGot({ key, view: { kind: 'refused', reason: o.text } });
        if (o?.status === 'done') revalidate();
      }, (e: unknown) => setSent({ key, outcome: noAnswerOf(e), done: false }))
      .finally(() => setSending(false));
  }, [key, view, sending, what, revalidate]);

  return { view, sending, outcome, done, send };
}
