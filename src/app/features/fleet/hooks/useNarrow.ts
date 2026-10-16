'use client';

import { useEffect, useState, type RefObject } from 'react';
import { useTextSize } from '@/lib/settings/useTextSize';
import { narrowLimit } from '../model/columns';

/** True while the element is at most `max` px wide at the Smaller setting (scaled by --ui-scale). The Tiers view drops the pips and names below it. */
export function useNarrow(ref: RefObject<HTMLElement | null>, max = 900): boolean {
  const [size] = useTextSize();
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
      setNarrow(el.offsetWidth <= narrowLimit(max, scale));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, max, size]);
  return narrow;
}
