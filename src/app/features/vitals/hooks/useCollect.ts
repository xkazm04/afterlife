'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { refreshVitals } from '../data/actions';
import { collectOnOpen, POLL_MS } from '../model/freshness';
import type { VitalsView } from '../model/types';

/**
 * Refresh, and the one collect on open (model/freshness collectOnOpen). refreshVitals only starts the server's background
 * job and answers at once; while the job runs (view.job without `done`) the page is re-read every POLL_MS, so the bands
 * and the notice follow it. No daemon: nothing polls once the job is done. `refused`: why the server would not start one.
 */
export function useCollect(view: VitalsView): { starting: boolean; running: boolean; refused?: string; refresh: () => void } {
  const router = useRouter();
  const [starting, start] = useTransition();
  const [refused, setRefused] = useState<string | undefined>(undefined);
  const { slug, lastCollected, job, now } = view;
  const refresh = useCallback(() => {
    start(async () => {
      const r = await refreshVitals(slug).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
      setRefused(r.ok ? undefined : r.error);
    });
  }, [slug]);
  const running = !!job && !job.done;
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (collectOnOpen(lastCollected, job, now)) refresh();
  }, [lastCollected, job, now, refresh]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [running, router]);
  return { starting, running, refused, refresh };
}
