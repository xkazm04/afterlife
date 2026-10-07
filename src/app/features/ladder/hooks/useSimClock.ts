'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { START_SEC, hms, wallTime } from '../model/clock';

/**
 * The screen's clock. `elapsed` re-renders the screen each second (for "polled N s ago"); `stamp()` is the time right
 * now, for ledger entries: the demo's simulated clock (from 14:24:12), or the wall clock in live mode (`live`). stamp is
 * only called on a click, so the first render is identical on the server and the client.
 */
export function useSimClock(live = false) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      ref.current += 1;
      setElapsed(ref.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const stamp = useCallback(() => (live ? wallTime(new Date()) : hms(START_SEC + ref.current)), [live]);
  return { elapsed, stamp };
}
