'use client';

import { useEffect, useState } from 'react';
import { cueOf, type Cue } from '../model/replay/cue';
import { initialState, seqAt, type Reel } from '../model/replay/state';
import { createReplayStore, type ReplayStore } from '../model/replay/store';
import { useReducedMotion } from './useReducedMotion';

const MAX_FRAME_MS = 100;

/** The page's `#seq=` address as a cue (model/replay/cue.ts); none when the host refuses the read. */
function cueFromAddress(reel: Reel): Cue | null {
  try {
    return cueOf(reel, window.location.hash + window.location.search);
  } catch {
    return null;
  }
}

/**
 * Owns the replay store and everything that makes it run: the frame clock (paused while the tab is hidden),
 * autoplay or the cued take on mount, the reduced-motion flag, and the `#seq=` address of the playhead. A cued seq
 * the film does not hold autoplays take 1 as no cue does, and is handed to `onMissingSeq` (a stable function, such as a
 * state setter) so the screen can say so.
 */
export function useReplayStore(reel: Reel, onMissingSeq?: (seq: number) => void): ReplayStore {
  const [store] = useState(() => createReplayStore(initialState(reel)));
  const reduced = useReducedMotion();

  useEffect(() => {
    store.dispatch({ type: 'reduced', on: reduced });
  }, [store, reduced]);

  useEffect(() => {
    const cue = cueFromAddress(store.get().reel);
    if (cue && 'missingSeq' in cue) onMissingSeq?.(cue.missingSeq);
    store.dispatch(cue && 'i' in cue ? { type: 'settled', i: cue.i } : { type: 'play', on: true });
  }, [store, onMissingSeq]);

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
        window.history.replaceState(window.history.state, '', `#seq=${seqAt(i, store.get().reel)}`);
      } catch {
        /* the address is a convenience; some hosts refuse it */
      }
    });
  }, [store]);

  return store;
}
