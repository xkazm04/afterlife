'use client';

import { useEffect, useRef, useState } from 'react';
import { livePollAge, wallTime } from '@/lib/clock/time';
import { PAGE_NOW } from '../data/pageFacts';
import type { PageFacts } from '../model/build/loadPage';

/**
 * The screen's clock. Demo: the prototype's constants. Live: the poll age counts up from the page's (it never wraps) and
 * the wall clock ticks each second; the wall time is null on the first render, so server and client agree. Hidden by
 * <Activity> it stops ticking; shown again it resumes from the first mount, so the poll age never restarts from the page's.
 * `page` absent (not read yet): no age and no time; the screen draws dashes for them.
 */
export function usePageClock(page: PageFacts | undefined): { ageSec: number | null; now: string | null } {
  const [elapsed, setElapsed] = useState(0);
  const [now, setNow] = useState<string | null>(null);
  const mounted = useRef<number | null>(null);
  const live = page?.live ?? false;
  useEffect(() => {
    if (!live) return;
    mounted.current ??= Date.now();
    const start = mounted.current;
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
  }, [live]);
  if (!page) return { ageSec: null, now: null };
  if (!page.live) return { ageSec: page.pollAgeSec, now: PAGE_NOW };
  return { ageSec: page.pollAgeSec === null ? null : livePollAge(elapsed, page.pollAgeSec), now };
}
