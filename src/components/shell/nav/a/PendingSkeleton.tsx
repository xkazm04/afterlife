'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';
import { setPendingNav, usePendingNav } from './pendingNav';
import { skeletonFor } from './warmPlan';

/**
 * The clicked module's own skeleton, drawn over the old screen (the same grid cell, later in the DOM) from the click until
 * the route commits: the old screen underneath is left as it is, so its scroll and state are untouched. It is the same
 * ScreenSkeleton the route's loading boundary paints, so the hand-over at commit shows no change.
 */
export function PendingSkeleton() {
  const pathname = usePathname();
  const pending = usePendingNav();
  const waiting = pending !== null && pending.from === pathname;
  useEffect(() => {
    if (pending && !waiting) setPendingNav(null); // committed (or moved elsewhere): the route draws itself now
  }, [pending, waiting]);
  const shape = waiting ? skeletonFor(pending.to) : null;
  return shape ? <ScreenSkeleton title={shape.title} layout={shape.layout} /> : null;
}
