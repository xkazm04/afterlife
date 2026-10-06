'use client';

import { useEffect } from 'react';

/** Keeps the stage fitted on resize (the first fit runs before paint: model/fit.ts). */
export function useStageFit(): void {
  useEffect(() => {
    const fit = () => {
      const s = Math.min(innerWidth / 1600, innerHeight / 1000);
      const d = document.documentElement.style;
      d.setProperty('--s', s.toFixed(4));
      d.setProperty('--ox', `${((innerWidth - 1600 * s) / 2).toFixed(1)}px`);
      d.setProperty('--oy', `${((innerHeight - 1000 * s) / 2).toFixed(1)}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      for (const v of ['--s', '--ox', '--oy']) document.documentElement.style.removeProperty(v);
    };
  }, []);
}
