'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useRef } from 'react';
import { entersNeedsYou } from './warmPlan';

/**
 * When Back or Forward brings the Needs-you desk back into view from another module, re-read it from the server in a
 * transition (the kept screen stays as it is until the fresh rows land), so a row that waits for a person is never left
 * on screen from an older read. Measured in `next dev`: a history traversal restores the kept route with no request at
 * all, while a link click already re-reads the desk (staleTimes.dynamic is 0 by default, docs 05-config staleTimes.md),
 * so only a traversal refreshes here: a refresh after a click would read the desk twice. Moves inside the desk (the list
 * and a decision's page) never refresh.
 */
export function useActivationRefresh(pathname: string | null): void {
  const router = useRouter();
  // the last two pathnames React rendered: the router may commit a traversal before or after our popstate listener runs
  const seen = useRef<{ prev: string | null; curr: string | null }>({ prev: null, curr: null });
  useEffect(() => {
    if (seen.current.curr !== pathname) seen.current = { prev: seen.current.curr, curr: pathname };
  }, [pathname]);
  useEffect(() => {
    const onPop = () => {
      const to = window.location.pathname;
      const { prev, curr } = seen.current;
      const from = curr === to ? prev : curr; // committed already: the path before it; not yet: the one on screen
      if (entersNeedsYou(from, to)) startTransition(() => router.refresh());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [router]);
}
