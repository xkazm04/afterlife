'use client';

import { useEffect, useState } from 'react';

/**
 * Whole seconds since the screen mounted, ticking once a second. It starts at 0 on both the server and the first
 * client render, so the countdown never disagrees with the HTML it hydrates.
 */
export function useElapsed(): number {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return sec;
}
