'use client';

import { useLayoutEffect } from 'react';
import { stageFit } from '../model/fit';

/** Keeps the stage fitted on resize. The first fit is before paint: the inline script (model/fit.ts) on a full load, this layout effect on a client return. */
export function useStageFit(): void {
  useLayoutEffect(() => {
    const fit = () => {
      for (const [k, v] of Object.entries(stageFit(innerWidth, innerHeight))) document.documentElement.style.setProperty(k, v);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      for (const v of ['--s', '--ox', '--oy']) document.documentElement.style.removeProperty(v);
    };
  }, []);
}
