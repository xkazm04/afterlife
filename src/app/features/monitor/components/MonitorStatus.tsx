'use client';

import { useEffect, useState } from 'react';
import { ageLine, polledAge, type Mode } from '../model/mode';

/**
 * The status bar: "184 projects on 7 leads · 115 decisions wait · polled 12 s ago". The age is the deep project's own
 * feed age (null: it has no good poll, and the line says so). The counter ticks in here, so the leads above never
 * re-render for it. Demo loops it at 60 s; live never wraps, because a wrap would claim a poll the page never saw
 * (the screen re-keys this on a fresher snapshot).
 */
export function MonitorStatus({ n, leads, waiting, mode, ageSec }: { n: number; leads: number; waiting: number; mode: Mode; ageSec: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (ageSec === null) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [ageSec]);
  return (
    <>
      {n} projects on {leads} leads · {waiting} decisions wait · {ageLine(polledAge(mode, ageSec, elapsed))}
    </>
  );
}
