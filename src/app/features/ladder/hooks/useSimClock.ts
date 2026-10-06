'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { START_SEC, hms } from '../model/clock';

/**
 * The demo's clock: it starts at 14:24:12 and ticks every second. `elapsed` re-renders the screen each second (for
 * "polled N s ago"); `stamp()` is the clock time right now, for ledger entries. No Date.now: the first render is
 * identical on the server and the client.
 */
export function useSimClock() {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      ref.current += 1;
      setElapsed(ref.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const stamp = useCallback(() => hms(START_SEC + ref.current), []);
  return { elapsed, stamp };
}
