'use client';

import { useEffect, useState } from 'react';

/** Whole seconds since `since` (ms), ticking each second while it is set; 0 when it is null. */
export function useElapsed(since: number | null): number {
  const [now, setNow] = useState(() => since ?? 0);
  useEffect(() => {
    if (since === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}
