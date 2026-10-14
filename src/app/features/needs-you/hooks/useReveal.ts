'use client';

import { useEffect } from 'react';
import type { NeedsState } from '../model/types';

/** "Read the draft" opens a section and scrolls to it, once per request. */
export function useReveal(reveal: NeedsState['reveal']) {
  useEffect(() => {
    if (!reveal) return;
    const frame = requestAnimationFrame(() => document.getElementById(`insp-${reveal.key}`)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [reveal]);
}
