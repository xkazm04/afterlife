'use client';

import { useEffect, useState } from 'react';
import { nextPolled, statusLine } from '../model/needs';

/**
 * The status bar text: "184 projects · 0 filters · polled 12 s ago". The poll counter ticks every second in here, so
 * the table above never re-renders for it. It starts from the snapshot's age; `live` keeps it from wrapping (a wrap
 * would claim a poll the page never saw). The screen remounts it when a fresher snapshot arrives.
 */
export function FleetStatus({ shown, total, filters, startSec, live }: { shown: number; total: number; filters: number; startSec: number; live: boolean }) {
  const [polled, setPolled] = useState(startSec);
  useEffect(() => {
    const id = setInterval(() => setPolled((n) => nextPolled(n, live)), 1000);
    return () => clearInterval(id);
  }, [live]);
  return <>{statusLine(shown, total, filters, polled)}</>;
}
