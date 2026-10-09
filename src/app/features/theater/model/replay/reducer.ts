// The replay reducer. Position = entry index + film time inside it; the frame depends only on (i, t), so a
// take replays exactly. Ported from the prototype's Player, with two deliberate tidy-ups: a looped take's
// restart is cancelled by any operator action, and Home/End clear a pending roll like the arrow keys do.
import {
  LOOP_GAP_MS, PREROLL_MS, PREROLL_REDUCED_MS, dwell, indexOfSeq, lengthOf, rangeOf, takeAt, takeOfIndex,
  type ReplayState,
} from './state';

export type Action =
  | { type: 'tick'; dt: number }
  /** Cue the entry (ledger click, Home, End): pauses, drops any roll. */
  | { type: 'seek'; i: number }
  | { type: 'step'; d: number }
  | { type: 'play'; on: boolean }
  | { type: 'toggle' }
  | { type: 'cue'; take: number }
  | { type: 'roll' }
  | { type: 'markIn' }
  | { type: 'markOut' }
  | { type: 'toggleLoop' }
  | { type: 'reduced'; on: boolean }
  /** A cued take from the URL: show the entry's settled frame, paused. */
  | { type: 'settled'; i: number };

const clampI = (s: ReplayState, i: number): number => Math.max(0, Math.min(lengthOf(s.reel) - 1, i));

function withPlaying(s: ReplayState, on: boolean): ReplayState {
  // Playing from the very end restarts the slice.
  if (on && s.i === lengthOf(s.reel) - 1 && s.t >= dwell(s.i, s.reel)) return { ...s, i: 0, t: 0, playing: true };
  return { ...s, playing: on };
}

function held(s: ReplayState, i: number): ReplayState {
  return { ...s, i: clampI(s, i), t: 0, playing: false, loopIn: 0 };
}

function go(s: ReplayState, i: number): ReplayState {
  return held({ ...s, preroll: 0, stopAt: null }, i);
}

function roll(s: ReplayState): ReplayState {
  const { a: ia, b: ib } = rangeOf(s);
  if (ia < 0 || ib < 0 || ib < 0) return s;
  const counts = s.counts.map((c, k) => (k === s.take ? c + 1 : c));
  return { ...held(s, ia), stopAt: ib, preroll: s.reduced ? PREROLL_REDUCED_MS : PREROLL_MS, counts };
}

function advance(s: ReplayState, dt: number): ReplayState {
  let { i, t, playing, loopIn } = s;
  t += dt;
  while (t >= dwell(i, s.reel)) {
    if (i < lengthOf(s.reel) - 1 && i !== s.stopAt) {
      t -= dwell(i, s.reel);
      i += 1;
    } else {
      t = dwell(i, s.reel);
      playing = false;
      if (s.loop && s.stopAt !== null) loopIn = LOOP_GAP_MS;
      break;
    }
  }
  return { ...s, i, t, playing, loopIn };
}

function tick(s: ReplayState, dt: number): ReplayState {
  if (s.preroll > 0) {
    const left = s.preroll - dt;
    return left > 0 ? { ...s, preroll: left } : withPlaying({ ...s, preroll: 0 }, true);
  }
  if (s.loopIn > 0) {
    const left = s.loopIn - dt;
    return left > 0 ? { ...s, loopIn: left } : roll({ ...s, loopIn: 0 });
  }
  return s.playing ? advance(s, dt) : s;
}

function mark(s: ReplayState, which: 'a' | 'b'): ReplayState {
  const base = s.mark ?? rangeOf(s);
  const next = which === 'a' ? { a: s.i, b: Math.max(base.b, s.i) } : { a: Math.min(base.a, s.i), b: s.i };
  return { ...s, mark: next };
}

function step(s: ReplayState, a: Action): ReplayState {
  switch (a.type) {
    case 'tick': return tick(s, a.dt);
    case 'seek': return go(s, a.i);
    case 'step': return go(s, s.i + a.d);
    case 'play': return withPlaying(s, a.on);
    case 'toggle': return withPlaying({ ...s, preroll: 0, loopIn: 0, stopAt: s.playing ? s.stopAt : null }, !s.playing);
    case 'cue': {
      const k = Math.max(0, Math.min(s.reel.takes.length - 1, a.take));
      return { ...held({ ...s, take: k, mark: null, stopAt: null, preroll: 0 }, indexOfSeq(takeAt(k, s.reel).a, s.reel)) };
    }
    case 'roll': return roll(s);
    case 'markIn': return mark(s, 'a');
    case 'markOut': return mark(s, 'b');
    case 'toggleLoop': return { ...s, loop: !s.loop, loopIn: s.loop ? 0 : s.loopIn };
    case 'reduced': return s.reduced === a.on ? s : { ...s, reduced: a.on };
    case 'settled': { const i = clampI(s, a.i); return { ...s, i, t: dwell(i, s.reel), playing: false, loopIn: 0 }; }
  }
}

/** The selected take follows the playhead unless a roll or marks hold it. */
function settle(s: ReplayState): ReplayState {
  if (s.preroll > 0 || s.stopAt !== null || s.mark) return s;
  const k = takeOfIndex(s.i, s.reel);
  return k >= 0 && k !== s.take ? { ...s, take: k } : s;
}

export function reduce(s: ReplayState, a: Action): ReplayState {
  const next = step(s, a);
  return next === s ? s : settle(next);
}
