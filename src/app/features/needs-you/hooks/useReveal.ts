'use client';

import { useEffect } from 'react';
import type { NeedsState } from '../model/types';

/** "Read the draft" opens a section and scrolls to it, once per request. `scope`: the cards' id prefix (Sec's InspScope). */
export function useReveal(reveal: NeedsState['reveal'], scope = '') {
  useEffect(() => {
    if (!reveal) return;
    const frame = requestAnimationFrame(() => document.getElementById(`${scope}insp-${reveal.key}`)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [reveal, scope]);
}
