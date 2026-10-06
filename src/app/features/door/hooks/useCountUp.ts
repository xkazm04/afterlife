'use client';

import { useEffect, useState } from 'react';

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
/** The first door of a page load arrives server-rendered with its final numbers; only later client mounts count up. */
let booted = false;

/**
 * A number counting up with the intro: 0 until `delay` ms, then n over `dur` ms. On the server-rendered first load it
 * is simply n (so a 115 never flashes to 0 at hydration); after a client-side navigation it counts. Text only.
 */
export function useCountUp(n: number, delay: number, dur: number, intro: boolean): number {
  const [counting, setCounting] = useState(() => booted && intro);
  const [v, setV] = useState(() => (booted && intro ? 0 : n));
  useEffect(() => {
    booted = true;
  }, []);
  useEffect(() => {
    if (!counting) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - t0 - delay) / dur));
      setV(Math.round(n * ease(t)));
      if (t < 1) raf = requestAnimationFrame(step);
      else setCounting(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [counting, n, delay, dur]);
  return counting && intro ? v : n;
}
