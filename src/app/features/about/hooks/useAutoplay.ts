'use client';

// Autoplay: while the film plays, each beat holds long enough for the camera to arrive and the caption to be read, then
// the next one comes (the reducer stops on the last beat, the summary). Reduced motion still steps, with cuts.
import { useEffect, type Dispatch } from 'react';
import type { FilmAction, FilmState } from '../model/playback';

/** One beat on screen while playing: the camera's move (1.25 s) and three seconds to read. */
export const BEAT_HOLD_MS = 4250;

export function useAutoplay(st: FilmState, dispatch: Dispatch<FilmAction>): void {
  const { playing, phase, beat } = st;
  useEffect(() => {
    if (!playing || phase !== 'film') return;
    const id = window.setTimeout(() => dispatch({ type: 'tick' }), BEAT_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [playing, phase, beat, dispatch]);
}
