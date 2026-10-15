'use client';

import { useEffect } from 'react';
import { stageFit } from '../model/fit';

/** Keeps the stage fitted on resize (the first fit runs before paint: model/fit.ts). */
export function useStageFit(): void {
  useEffect(() => {
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
