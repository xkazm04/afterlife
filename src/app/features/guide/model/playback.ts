// The guide's playback, as a transition table: where it is in the story and whether it plays by itself. Pure, so the
// rail, the keys and the autoplay timer all move it the same way.
import { STEPS } from './steps';

export interface Playback {
  /** The step on screen. */
  i: number;
  /** Autoplay: the next step comes by itself after STEP_MS, except on a step that holds. */
  playing: boolean;
}

export type PlaybackEvent =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'go'; to: number }
  | { type: 'toggle' }
  /** The autoplay timer ran out on step `at` (a tick that arrives late, after a manual move, is dropped). */
  | { type: 'tick'; at: number };

/** How long a step holds before autoplay moves on (the winner's 7 s). */
export const STEP_MS = 7000;

const last = STEPS.length - 1;
const clamp = (i: number): number => Math.max(0, Math.min(last, i));

/** The start: step one, playing unless motion is reduced (then nothing moves by itself). */
export const startPlayback = (reduced: boolean, at = 0): Playback => ({ i: clamp(at), playing: !reduced });

/** Whether autoplay should arm a timer on this state. */
export const autoAdvances = (p: Playback): boolean => p.playing && p.i < last && !STEPS[p.i]?.hold;

/** One event in, the next state out. A manual move stops autoplay, as the winner did; play from the end starts over. */
export function playback(p: Playback, e: PlaybackEvent): Playback {
  switch (e.type) {
    case 'next':
      return { i: clamp(p.i + 1), playing: false };
    case 'prev':
      return { i: clamp(p.i - 1), playing: false };
    case 'go':
      return { i: clamp(e.to), playing: false };
    case 'toggle':
      return p.playing ? { ...p, playing: false } : { i: p.i === last ? 0 : p.i, playing: true };
    case 'tick':
      return e.at === p.i && autoAdvances(p) ? { ...p, i: p.i + 1 } : p;
  }
}
