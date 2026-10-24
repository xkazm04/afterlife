'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Whole seconds since the screen mounted, ticking once a second. It starts at 0 on both the server and the first
 * client render, so the countdown never disagrees with the HTML it hydrates. The start is kept across a hide: a route
 * hidden by <Activity> stops ticking (its effects clean up) and, shown again, catches up to the wall clock, never back to 0.
 */
export function useElapsed(): number {
  const [sec, setSec] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current ??= Date.now();
    const t0 = start.current;
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return sec;
}
