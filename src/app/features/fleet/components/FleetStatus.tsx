'use client';

import { useEffect, useState } from 'react';
import type { TrendFeed } from '@/lib/trend/trend';
import { nextPolled, statusLine } from '../model/needs';
import { TrendNote } from './trend/TrendNote';

/**
 * The status bar text: "184 projects · 0 filters · polled 12 s ago". The poll counter ticks every second in here, so
 * the table above never re-renders for it. It starts from the snapshot's age; `live` keeps it from wrapping (a wrap
 * would claim a poll the page never saw). The screen remounts it when a fresher snapshot arrives. `trend`, when read,
 * adds the fleet's week ("since last week: +2 waiting · +1 stale").
 */
export function FleetStatus({ shown, total, filters, startSec, live, trend }: { shown: number; total: number; filters: number; startSec: number | null; live: boolean; trend?: TrendFeed | null }) {
  const [polled, setPolled] = useState(startSec);
  useEffect(() => {
    if (startSec === null) return; // no poll read yet: nothing to count up from
    const id = setInterval(() => setPolled((n) => (n === null ? n : nextPolled(n, live))), 1000);
    return () => clearInterval(id);
  }, [live, startSec]);
  return (
    <>
      {statusLine(shown, total, filters, polled)}
      {trend ? <TrendNote feed={trend} /> : null}
    </>
  );
}
