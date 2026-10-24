'use client';

import { useEffect, useState } from 'react';
import type { LivePayload } from '../model/types';
import { livePoll } from './livePoll';

/**
 * The polled payload and a clock (livePoll.ts): /api/runs every 2 s while the tab is visible (paused when hidden, one
 * fetch on return); a failed fetch keeps the last payload, so the frame goes stale on its own. `now` ticks each second.
 * Before mount `now` is the server's read time, so the first client render matches the server markup.
 */
export function useLivePayload(initial: LivePayload): { payload: LivePayload; now: number } {
  const [payload, setPayload] = useState(initial);
  const [now, setNow] = useState(initial.generatedAt);
  useEffect(
    () =>
      livePoll(
        {
          fetchPayload: async () => {
            const r = await fetch('/api/runs', { cache: 'no-store' });
            return r.ok ? ((await r.json()) as LivePayload) : null;
          },
          hidden: () => document.hidden,
          now: () => Date.now(),
          every: (fn, ms) => {
            const id = window.setInterval(fn, ms);
            return () => window.clearInterval(id);
          },
          onVisibility: (fn) => {
            document.addEventListener('visibilitychange', fn);
            return () => document.removeEventListener('visibilitychange', fn);
          },
        },
        setPayload,
        setNow,
      ),
    [],
  );
  return { payload, now };
}
