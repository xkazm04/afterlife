'use client';

import { useEffect, useState } from 'react';

/**
 * True once nobody has moved the pointer, pressed a key or scrolled for `ms`: the door then pauses its ambient motion
 * (pulses, breathing, blinking, scan), so a page left open costs nothing. Any input wakes it.
 */
export function useStill(ms = 15000): boolean {
  const [still, setStill] = useState(false);
  useEffect(() => {
    let id = setTimeout(() => setStill(true), ms);
    const wake = () => {
      clearTimeout(id);
      setStill(false);
      id = setTimeout(() => setStill(true), ms);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    for (const e of events) window.addEventListener(e, wake, { passive: true });
    return () => {
      clearTimeout(id);
      for (const e of events) window.removeEventListener(e, wake);
    };
  }, [ms]);
  return still;
}
