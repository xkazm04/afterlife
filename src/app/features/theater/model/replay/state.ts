// The replay player's state and the things read off it (ranges, progress, readouts). Pure.
import { REPLAY_LEDGER } from '../../data/ledger';
import { TAKES } from '../../data/constants';
import type { Marks, Take } from '../types';

export const N = REPLAY_LEDGER.length;
export const FIRST_SEQ = REPLAY_LEDGER[0]?.seq ?? 0;
export const LAST_SEQ = REPLAY_LEDGER[N - 1]?.seq ?? 0;
export const DEFAULT_DWELL_MS = 2600;
export const PREROLL_MS = 2000;
export const PREROLL_REDUCED_MS = 1000;
/** Pause between the end of a looped take and its next roll. */
export const LOOP_GAP_MS = 800;

export interface ReplayState {
  /** Ledger entry index. */
  i: number;
  /** Film time inside the entry, ms. */
  t: number;
  playing: boolean;
  /** Selected take, 0..7. */
  take: number;
  /** Marked in/out, or null to use the take's own range. */
  mark: Marks | null;
  /** Entry index where a roll stops, or null for free play. */
  stopAt: number | null;
  loop: boolean;
  /** Pre-roll time left, ms (0 = none). */
  preroll: number;
  /** Wait before a looped take rolls again, ms (0 = none). */
  loopIn: number;
  /** Rolls per take. */
  counts: readonly number[];
  reduced: boolean;
}

export const initialState = (): ReplayState => ({
  i: 0, t: 0, playing: false, take: 0, mark: null, stopAt: null, loop: false,
  preroll: 0, loopIn: 0, counts: TAKES.map(() => 0), reduced: false,
});

export const dwell = (i: number): number => REPLAY_LEDGER[i]?.d ?? DEFAULT_DWELL_MS;
export const seqAt = (i: number): number => REPLAY_LEDGER[i]?.seq ?? 0;
export const indexOfSeq = (seq: number): number => REPLAY_LEDGER.findIndex((e) => e.seq === seq);
export const takeAt = (k: number): Take => TAKES[k] ?? TAKES[0] ?? { name: '', a: 0, b: 0 };
export const takeOfSeq = (seq: number): number => TAKES.findIndex((t) => seq >= t.a && seq <= t.b);

/** Film progress through the current entry, 0..1. */
export const progress = (s: Pick<ReplayState, 'i' | 't'>): number => Math.min(1, s.t / dwell(s.i));

/** The range a roll plays: the marked in/out, or the selected take's own. */
export function rangeOf(s: Pick<ReplayState, 'take' | 'mark'>): Marks {
  if (s.mark) return s.mark;
  const t = takeAt(s.take);
  return { a: t.a, b: t.b };
}

/** Whole seconds of pre-roll left to show ("Pre-roll 2…"); 0 when none. */
export const prerollLeft = (s: Pick<ReplayState, 'preroll'>): number => (s.preroll > 0 ? Math.max(1, Math.ceil(s.preroll / 1000)) : 0);

export interface Readout {
  text: string;
  /** Rolling or pre-rolling: the readout is drawn live (red). */
  live: boolean;
}

/** What the screen (everything but the film position) reads: it changes on entry, take, marks and transport only. */
export interface View {
  i: number;
  take: number;
  mark: Marks | null;
  counts: readonly number[];
  playing: boolean;
  loop: boolean;
  /** Whole seconds of pre-roll left, 0 when none. */
  left: number;
  /** A roll is armed: playing stops at its out-point. */
  rolling: boolean;
}

export const viewOf = (s: ReplayState): View => ({
  i: s.i, take: s.take, mark: s.mark, counts: s.counts, playing: s.playing, loop: s.loop, left: prerollLeft(s), rolling: s.stopAt !== null,
});

/** The transport readout: Held, Pre-roll n…, Rolling to out, Free play. */
export function readoutFrom(v: Pick<View, 'playing' | 'left' | 'rolling'>): Readout {
  if (v.left) return { text: `Pre-roll ${v.left}…`, live: true };
  if (v.playing) return v.rolling ? { text: '● Rolling to out', live: true } : { text: '▶ Free play', live: false };
  return { text: 'Held', live: false };
}

export const readoutOf = (s: ReplayState): Readout => readoutFrom(viewOf(s));

/** The status bar line, after the "Replay" word: seq, clock, take.roll and in → out. */
export function slateText(s: Pick<ReplayState, 'i' | 'take' | 'mark' | 'counts'>): string {
  const e = REPLAY_LEDGER[s.i];
  const r = rangeOf(s);
  const roll = Math.max(1, s.counts[s.take] ?? 0);
  return `seq ${e?.seq ?? 0} · ${e?.t ?? ''} · take ${s.take + 1}.${roll} · in ${r.a} → out ${r.b}${s.mark ? ' (marked)' : ''}`;
}
