'use client';

import { useEffect, useState } from 'react';

/**
 * The status bar: "184 projects on 7 leads · 115 decisions wait · polled 12 s ago". The poll counter ticks in here,
 * so the leads above never re-render for it.
 */
export function MonitorStatus({ n, leads, waiting, startSec }: { n: number; leads: number; waiting: number; startSec: number }) {
  const [polled, setPolled] = useState(startSec);
  useEffect(() => {
    const id = setInterval(() => setPolled((s) => (s >= 59 ? 0 : s + 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      {n} projects on {leads} leads · {waiting} decisions wait · polled {polled} s ago
    </>
  );
}
