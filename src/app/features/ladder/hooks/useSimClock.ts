'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { demoInstant } from '../model/clock';

/**
 * The screen's clock. `elapsed` re-renders the screen each second (for "polled N s ago"); `stamp()` is the instant right
 * now (epoch ms), for ledger entries: the demo's simulated clock (from 14:24:12 UTC on DEMO_NOW's day), or the wall
 * clock in live mode (`live`). The reducer labels it in the screen's zone (LadderState.tz), never the browser's. stamp is
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
  const stamp = useCallback(() => (live ? Date.now() : demoInstant(ref.current)), [live]);
  return { elapsed, stamp };
}
