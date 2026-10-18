'use client';

import { useEffect, useState } from 'react';
import type { LivePayload } from '../model/types';

export const POLL_MS = 2000;

/**
 * The polled payload and a clock. Fetches /api/runs every 2 s while the tab is visible (paused when hidden, one fetch on
 * return); a failed fetch keeps the last payload, so the frame goes stale on its own. `now` ticks each second.
 * Before mount `now` is the server's read time, so the first client render matches the server markup.
 */
export function useLivePayload(initial: LivePayload): { payload: LivePayload; now: number } {
  const [payload, setPayload] = useState(initial);
  const [now, setNow] = useState(initial.generatedAt);
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch('/api/runs', { cache: 'no-store' });
        if (r.ok && alive) setPayload((await r.json()) as LivePayload);
      } catch {
        /* keep the last payload */
      }
    };
    const tick = () => {
      if (!document.hidden) setNow(Date.now());
    };
    const onVisible = () => {
      tick();
      void pull();
    };
    tick();
    const poll = window.setInterval(() => void pull(), POLL_MS);
    const clock = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return { payload, now };
}
