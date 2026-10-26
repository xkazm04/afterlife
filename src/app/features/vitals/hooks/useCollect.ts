'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRevalidate, useScreenRead } from '@/components/shell/host';
import { refreshVitals } from '../data/actions';
import { collectOnOpen, POLL_MS } from '../model/freshness';
import type { VitalsView } from '../model/types';

/**
 * Refresh, and the one collect on open (model/freshness collectOnOpen). refreshVitals only starts the server's background
 * job and answers at once, then the screen is re-read (the host's revalidate) so the job shows; while the job runs
 * (view.job without `done`) the screen is re-read every POLL_MS, so the bands and the notice follow it. No daemon:
 * nothing polls once the job is done, nor while the screen is not showing. `refused`: why the server would not start one.
 *
 * Collect on open, once per activation: each time the project's screen is shown (opened, or shown again from the kept
 * screens) it decides once, and only on this showing's own fresh read (`ready`: the config, the CI part and the job are
 * read, and no read is in flight), never on the kept copy of an earlier showing.
 */
export function useCollect(view: VitalsView, ready = true): { starting: boolean; running: boolean; refused?: string; refresh: () => void } {
  const revalidate = useRevalidate();
  const reading = useScreenRead().reading;
  const [starting, start] = useTransition();
  const [refused, setRefused] = useState<string | undefined>(undefined);
  const { slug, lastCollected, job, now } = view;
  const refresh = useCallback(() => {
    start(async () => {
      const r = await refreshVitals(slug).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
      setRefused(r.ok ? undefined : r.error);
      if (r.ok) revalidate();
    });
  }, [slug, revalidate]);
  const running = !!job && !job.done;
  const decided = useRef(false);
  // an activation: the effects run again when a kept screen is shown, so the decision is taken again on that showing
  useEffect(() => {
    decided.current = false;
  }, []);
  const fresh = ready && !reading;
  useEffect(() => {
    if (decided.current || !fresh) return;
    decided.current = true;
    if (collectOnOpen(lastCollected, job, now)) refresh();
  }, [fresh, lastCollected, job, now, refresh]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => revalidate(), POLL_MS);
    return () => clearInterval(t);
  }, [running, revalidate]);
  return { starting, running, refused, refresh };
}
