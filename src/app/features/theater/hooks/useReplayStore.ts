'use client';

import { useEffect, useState } from 'react';
import { indexOfSeq, initialState, seqAt, type Reel } from '../model/replay/state';
import { createReplayStore, type ReplayStore } from '../model/replay/store';
import { frameClock } from './frameClock';
import { useReducedMotion } from './useReducedMotion';

/** `#seq=NNN` (or `?seq=NNN`) cues a take: it shows that entry's settled frame, paused. */
function cuedIndex(reel: Reel): number {
  try {
    const m = /seq=(\d+)/.exec(window.location.hash + window.location.search);
    return m ? indexOfSeq(Number(m[1]), reel) : -1;
  } catch {
    return -1;
  }
}

/**
 * Owns the replay store and everything that makes it run: the frame clock (paused while the tab is hidden),
 * autoplay or the cued take on mount, the reduced-motion flag, and the `#seq=` address of the playhead.
 */
export function useReplayStore(reel: Reel): ReplayStore {
  const [store] = useState(() => createReplayStore(initialState(reel)));
  const reduced = useReducedMotion();

  useEffect(() => {
    store.dispatch({ type: 'reduced', on: reduced });
  }, [store, reduced]);

  useEffect(() => {
    const cue = cuedIndex(store.get().reel);
    store.dispatch(cue >= 0 ? { type: 'settled', i: cue } : { type: 'play', on: true });
  }, [store]);

  useEffect(() => {
    const clock = frameClock(store, { raf: requestAnimationFrame, caf: cancelAnimationFrame, now: () => performance.now() });
    const onVisibility = () => (document.hidden ? clock.stop() : clock.start());
    if (!document.hidden) clock.start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clock.stop();
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
        window.history.replaceState(window.history.state, '', `#seq=${seqAt(i, store.get().reel)}`);
      } catch {
        /* the address is a convenience; some hosts refuse it */
      }
    });
  }, [store]);

  return store;
}
