// Motion: where the climbers are at film position (entry, progress). Pure and deterministic: the frame
// depends only on the entry, the beat and p (0..1 through the entry's dwell).
import type { LedgerEntry } from '../types';

/** Holds run from beat 1 (bottom) to beat 9 (top): eight steps. */
export const HOLD_STEPS = 8;
/** The !44 line's guardbar sits at hold 5 (step 4). */
export const GUARD_STEP = 4;
/** On the ground the !41 chip sits this many bolt-heights below hold 1, so it is never clipped by the pane. */
export const GROUND_LIFT = 1.1;
/** Caption stays between these hold steps so it never leaves the wall. */
const CAP_MIN = 0.4;
const CAP_MAX = 7.2;

/** Caption percent from the bottom, beside a climber at this step, never off the wall. */
const capAt = (step: number): number => Math.min(pct(CAP_MAX), Math.max(pct(CAP_MIN), pct(step)));

export const easeOut = (k: number): number => 1 - Math.pow(1 - k, 3);
/** Hold step -> percent from the bottom of the wall. */
export const pct = (step: number): number => (step / HOLD_STEPS) * 100;

export interface Motion {
  /** !41 position in hold steps (beat 0 is -0.4). */
  pos: number;
  /** !41 chip percent from the bottom (never below hold 1). */
  c41: number;
  /** Bolt-heights to pull the chip down by (only on the ground). */
  lift: number;
  /** !44 position in hold steps; hidden before seq 505. */
  y44: number;
  show44: boolean;
  /** !44 has fallen and been arrested at the guardrail (from seq 509). */
  caught: boolean;
  /** Caption percent from the bottom: it rides beside the climber of the current scene. */
  cap: number;
}

/** `from`: the beat before this entry (default: the hold below). `side`: the illustrative !44 line is drawn. */
export interface MotionOpts {
  from?: number;
  side?: boolean;
}

const stepOf = (beat: number): number => (beat ? beat - 1 : -0.4);

export function motionAt(e: LedgerEntry, beat: number, p: number, reduced: boolean, { from, side = true }: MotionOpts = {}): Motion {
  let pos = stepOf(beat);
  const start = stepOf(from ?? (e.beat ?? 1) - 1);
  if (e.beat && e.beat > 1 && from !== e.beat && !reduced) pos = start + (e.beat - 1 - start) * easeOut(Math.min(1, p / 0.55));
  const k = reduced ? 1 : Math.min(1, p / 0.6);
  if (!side) return { pos, c41: pct(Math.max(0, pos)), lift: pos < 0 ? GROUND_LIFT : 0, y44: 0, show44: false, caught: false, cap: capAt(pos) };
  let y44 = 0;
  if (e.seq === 505) y44 = 1.5 * easeOut(k);
  else if (e.seq === 506) y44 = 1.5 + 1.5 * easeOut(k);
  else if (e.seq === 507) y44 = 3 + 1.2 * easeOut(k);
  else if (e.seq === 508) y44 = 4.2;
  else if (e.seq === 509) y44 = 4.2 - 0.5 * (reduced ? 1 : easeOut(k)); // the fall, arrested at the guardrail
  else if (e.seq > 509) y44 = 3.7;
  const cy = e.sc === 'm44' ? y44 : pos;
  return {
    pos,
    c41: pct(Math.max(0, pos)),
    lift: pos < 0 ? GROUND_LIFT : 0,
    y44,
    show44: e.seq >= 505,
    caught: e.seq >= 509,
    cap: capAt(cy),
  };
}
