'use client';

import { useEffect, useState, type RefObject } from 'react';

/** True while the element is at most `max` px wide. The Tiers view drops the pips and names below 900px. */
export function useNarrow(ref: RefObject<HTMLElement | null>, max = 900): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setNarrow(el.offsetWidth <= max));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, max]);
  return narrow;
}
