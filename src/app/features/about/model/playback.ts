// The film's playback, as a pure reducer: which beat is on screen, whether the intro still runs, whether the film plays
// by itself. Time lives in the hooks (useAutoplay sends `tick`, useFilmCamera sends `endIntro`); this only decides.
import { clamp } from './rng';

export type Phase = 'intro' | 'film';

export interface FilmState {
  /** How many beats the film has (the loop's length). */
  n: number;
  beat: number;
  phase: Phase;
  playing: boolean;
}

export type FilmAction =
  | { type: 'endIntro'; autoplay: boolean }
  | { type: 'skipIntro' }
  | { type: 'goto'; beat: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'first' }
  | { type: 'last' }
  | { type: 'toggle' }
  | { type: 'tick' };

export function initialFilm(n: number): FilmState {
  return { n, beat: 0, phase: 'intro', playing: false };
}

const lastOf = (s: FilmState) => Math.max(0, s.n - 1);

/** A scrub: the intro (if any) ends, the film stops playing by itself, the beat is clamped to the film. */
function scrub(s: FilmState, beat: number): FilmState {
  return { ...s, phase: 'film', playing: false, beat: clamp(beat, 0, lastOf(s)) };
}

export function filmReducer(s: FilmState, a: FilmAction): FilmState {
  switch (a.type) {
    case 'endIntro':
      return s.phase === 'intro' ? { ...s, phase: 'film', beat: 0, playing: a.autoplay && s.n > 1 } : s;
    case 'skipIntro':
      return s.phase === 'intro' ? { ...s, phase: 'film', beat: 0, playing: false } : s;
    case 'goto':
      return scrub(s, a.beat);
    case 'next':
      return scrub(s, s.phase === 'intro' ? 0 : s.beat + 1);
    case 'prev':
      return scrub(s, s.phase === 'intro' ? 0 : s.beat - 1);
    case 'first':
      return scrub(s, 0);
    case 'last':
      return scrub(s, lastOf(s));
    case 'toggle':
      if (s.playing) return { ...s, playing: false };
      // Play from the last beat replays the film from the start.
      return { ...s, phase: 'film', playing: s.n > 1, beat: s.beat >= lastOf(s) ? 0 : s.beat };
    case 'tick': {
      if (!s.playing || s.phase !== 'film') return s;
      const beat = Math.min(s.beat + 1, lastOf(s));
      // The film stops on its last beat, the summary: nothing plays past it.
      return { ...s, beat, playing: beat < lastOf(s) };
    }
  }
}
