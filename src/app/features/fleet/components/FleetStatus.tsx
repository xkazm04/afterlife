'use client';

import { useEffect, useState } from 'react';
import { nextPolled, statusLine } from '../model/needs';

/**
 * The status bar text: "184 projects · 0 filters · polled 12 s ago". The poll counter ticks every second in here, so
 * the table above never re-renders for it.
 */
export function FleetStatus({ shown, total, filters, startSec }: { shown: number; total: number; filters: number; startSec: number }) {
  const [polled, setPolled] = useState(startSec);
  useEffect(() => {
    const id = setInterval(() => setPolled(nextPolled), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{statusLine(shown, total, filters, polled)}</>;
}
