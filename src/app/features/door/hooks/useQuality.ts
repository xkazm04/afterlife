'use client';

import { useEffect } from 'react';
import { QUALITY_KEY } from '../model/fit';

/** A frame slower than this (the median over the probe) means the machine cannot afford ambient motion. */
const SLOW_MS = 24;

/**
 * The render tier, measured once per machine: on a first visit (no tier stored, none forced by ?quality=) the door
 * times about 1.6 s of frames while the intro runs. A median over 24 ms (under ~42 fps) switches it to lite (no ambient
 * motion, grain or bloom) on the spot and for later visits. It never upgrades itself; ?quality=full does.
 */
export function useQuality(): void {
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.doorQ || document.hidden) return;
    const t: number[] = [];
    let last = 0;
    let raf = 0;
    const start = performance.now() + 400; // after hydration settles
    const decide = () => {
      if (t.length < 8) return;
      const median = t.slice().sort((a, b) => a - b)[Math.floor(t.length / 2)]!;
      const tier = median > SLOW_MS ? 'lite' : 'full';
      html.dataset.doorQ = tier;
      try {
        localStorage.setItem(QUALITY_KEY, tier);
      } catch {}
    };
    const step = (now: number) => {
      if (now > start) {
        if (last) t.push(now - last);
        last = now;
      }
      if (t.length < 96 && now - start < 1600) raf = requestAnimationFrame(step);
      else decide();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
}
