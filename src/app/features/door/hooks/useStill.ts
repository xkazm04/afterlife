'use client';

import { useEffect, useState } from 'react';

/**
 * True once nobody has moved the pointer, pressed a key or scrolled for `ms`: the door then pauses its ambient motion
 * (pulses, breathing, blinking, scan), so a page left open costs nothing. Any input wakes it. An input only stamps the
 * time: the one timer re-arms itself for what is left of the wait, so a pointer sweep (a hundred events a second) does
 * not clear and set a timer per event.
 */
export function useStill(ms = 15000): boolean {
  const [still, setStill] = useState(false);
  useEffect(() => {
    let last = Date.now();
    let id: ReturnType<typeof setTimeout> | null = null;
    const check = () => {
      const left = ms - (Date.now() - last);
      if (left > 0) id = setTimeout(check, left);
      else {
        id = null;
        setStill(true);
      }
    };
    id = setTimeout(check, ms);
    const wake = () => {
      last = Date.now();
      if (id !== null) return;
      setStill(false);
      id = setTimeout(check, ms);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    for (const e of events) window.addEventListener(e, wake, { passive: true });
    return () => {
      if (id !== null) clearTimeout(id);
      for (const e of events) window.removeEventListener(e, wake);
    };
  }, [ms]);
  return still;
}
