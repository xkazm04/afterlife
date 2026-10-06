'use client';

import { useEffect, useState } from 'react';
import { indexOfSeq, seqAt } from '../model/replay/state';
import { createReplayStore, type ReplayStore } from '../model/replay/store';
import { useReducedMotion } from './useReducedMotion';

const MAX_FRAME_MS = 100;

/** `#seq=NNN` (or `?seq=NNN`) cues a take: it shows that entry's settled frame, paused. */
function cuedIndex(): number {
  try {
    const m = /seq=(\d+)/.exec(window.location.hash + window.location.search);
    return m ? indexOfSeq(Number(m[1])) : -1;
  } catch {
    return -1;
  }
}

/**
 * Owns the replay store and everything that makes it run: the frame clock (paused while the tab is hidden),
 * autoplay or the cued take on mount, the reduced-motion flag, and the `#seq=` address of the playhead.
 */
export function useReplayStore(): ReplayStore {
  const [store] = useState(createReplayStore);
  const reduced = useReducedMotion();

  useEffect(() => {
    store.dispatch({ type: 'reduced', on: reduced });
  }, [store, reduced]);

  useEffect(() => {
    const cue = cuedIndex();
    store.dispatch(cue >= 0 ? { type: 'settled', i: cue } : { type: 'play', on: true });
  }, [store]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(MAX_FRAME_MS, now - last);
      last = now;
      const s = store.get();
      if (s.playing || s.preroll > 0 || s.loopIn > 0) store.dispatch({ type: 'tick', dt });
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [store]);

  useEffect(() => {
    let shown = -1;
    return store.subscribe(() => {
      const i = store.get().i;
      if (i === shown) return;
      shown = i;
      try {
        window.history.replaceState(window.history.state, '', `#seq=${seqAt(i)}`);
      } catch {
        /* the address is a convenience; some hosts refuse it */
      }
    });
  }, [store]);

  return store;
}
