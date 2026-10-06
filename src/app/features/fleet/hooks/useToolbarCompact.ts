'use client';

import { useEffect, useState, type RefObject } from 'react';
import { useTextSize } from '@/lib/settings/useTextSize';

/** The toolbar needs about this many px at the Smaller setting to show every word (measured; it scales with the text size). */
const FULL_WIDTH_PX = 1190;

/**
 * True when the toolbar is too narrow for the status lozenge to carry words (waiting, stale, ...). The counts and
 * tooltips stay. `anchor` is any element inside the toolbar; the toolbar is its <header>.
 */
export function useToolbarCompact(anchor: RefObject<HTMLElement | null>): boolean {
  const [size] = useTextSize();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const header = anchor.current?.closest('header');
    if (!header) return;
    const ro = new ResizeObserver(() => {
      const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')) || 1;
      setCompact(header.clientWidth < FULL_WIDTH_PX * scale);
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, [anchor, size]);
  return compact;
}
