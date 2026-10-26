'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EntranceProps } from '../types';
import { Knot } from './Knot';
import { GatesDefs } from './Filigree';
import { Leaf } from './Leaf';
import { Light } from './Light';
import styles from './gates.module.css';

/**
 * The gates' clock in ms, as the stylesheets also write it (pinned by __tests__/proofs/gatesClock.test.ts): when they
 * part (the CSS clock from first paint), how long they swing (--g-sw: full, lite, fast), and when the CSS fail-safe
 * drops the overlay unless the script has marked it live by then.
 */
export const GATES_MS = { open: 2200, swing: 1300, swingLite: 900, swingFast: 560, failsafe: 6000 } as const;
const { open: T_OPEN, swing: SWING, swingLite: SWING_LITE, swingFast: SWING_FAST, failsafe: FAILSAFE } = GATES_MS;

type Phase = 'run' | 'open' | 'fast';

/** How far the server-painted timeline already ran when the script woke (hydration can be late): the clock dot's animation. */
function elapsed(el: Element | null): number {
  const t = el?.getAnimations?.()[0]?.currentTime;
  return typeof t === 'number' ? t : 0;
}

/**
 * Entrance B, the treasure gates: two graphite leaves meet on a seam, the Afterlife knot their lock. The gates emerge from
 * the dark (0-800 ms), current runs through the filigree to the lock (300-1250), the pin is drawn in and the knot turns
 * (900-1950), the treasure's amber cracks the seam (1750-2150); at 2200 they swing out toward the viewer and the city
 * shows through (onOpen), and when they have left the frame the overlay is done (onDone, 3500). A key or a click
 * anywhere opens at once (a 560 ms swing).
 */
export function GatesEntrance({ onOpen, onDone }: EntranceProps) {
  const clock = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('run');
  const cb = useRef({ onOpen, onDone });
  const opened = useRef(false);
  const done = useRef(false);
  useEffect(() => {
    cb.current = { onOpen, onDone };
  }, [onOpen, onDone]);

  // hydrated in time: the script runs the gates now, so the CSS fail-safe stands down (a late hydration leaves the gates dropped)
  useEffect(() => {
    if (elapsed(clock.current) < FAILSAFE && root.current) root.current.dataset.live = '';
  }, []);

  const open = useCallback((fast: boolean) => {
    if (opened.current) return;
    opened.current = true;
    setPhase(fast ? 'fast' : 'open');
    cb.current.onOpen();
  }, []);

  // the ceremony: open on the CSS clock, or at once on any key or press
  useEffect(() => {
    if (phase !== 'run') return;
    const t = setTimeout(() => open(false), Math.max(0, T_OPEN - elapsed(clock.current)));
    const skip = () => open(true);
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [phase, open]);

  // the swing: done when the leaves have left the frame
  useEffect(() => {
    if (phase === 'run') return;
    const lite = document.documentElement.dataset.doorQ === 'lite';
    const ms = phase === 'fast' ? SWING_FAST : lite ? SWING_LITE : SWING;
    const t = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      cb.current.onDone();
    }, ms + 40);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div ref={root} className={styles.root} data-gp={phase} data-gopen={phase === 'run' ? undefined : ''}>
      <i ref={clock} className={styles.clock} aria-hidden />
      <GatesDefs />
      <div className={styles.dark} aria-hidden />
      <div className={styles.gates} aria-hidden>
        <Leaf side="l" />
        <Leaf side="r" />
        <div className={styles.vignette} />
        <div className={styles.veil} />
      </div>
      <Light />
      <button type="button" className={styles.lock} aria-label="Open the door" disabled={phase !== 'run'} onClick={() => open(true)}>
        <Knot />
      </button>
      <p className={styles.hint} aria-hidden>
        Press any key
      </p>
    </div>
  );
}
