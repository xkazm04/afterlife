'use client';

import { useEffect, useState } from 'react';
import { livePollAge, wallTime } from '../../ladder/model/clock';
import { PAGE_NOW } from '../data/pageFacts';
import type { PageFacts } from '../model/build/loadPage';

/**
 * The screen's clock. Demo: the prototype's constants. Live: the poll age counts up from the page's (it never wraps) and
 * the wall clock ticks each second; the wall time is null on the first render, so server and client agree.
 */
export function usePageClock(page: PageFacts): { ageSec: number | null; now: string | null } {
  const [elapsed, setElapsed] = useState(0);
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    if (!page.live) return;
    const start = Date.now();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
      setNow(wallTime(new Date()));
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [page.live]);
  if (!page.live) return { ageSec: page.pollAgeSec, now: PAGE_NOW };
  return { ageSec: page.pollAgeSec === null ? null : livePollAge(elapsed, page.pollAgeSec), now };
}
