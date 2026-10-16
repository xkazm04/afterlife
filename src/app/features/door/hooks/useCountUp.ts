'use client';

import { useEffect, useState } from 'react';

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
/** The count-up schedules the door uses (ms): the headline waits for the marks to land, then every mark and proof count runs together. */
export const COUNT_BIG = { delay: 2400, dur: 800 } as const;
export const COUNT_MARK = { delay: 1200, dur: 2000 } as const;
/** When the last count finishes: the intro (useDoor's INTRO_MS) must not end before it, or the numbers jump to final mid-count. */
export const COUNT_END = Math.max(COUNT_BIG.delay + COUNT_BIG.dur, COUNT_MARK.delay + COUNT_MARK.dur);

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
    if (!counting || !intro) return; // once the intro ended the value is discarded (see the return): stop the frame loop
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
  }, [counting, intro, n, delay, dur]);
  return counting && intro ? v : n;
}
