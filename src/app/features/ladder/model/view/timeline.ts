// The to-scale "who acted" axis: events are placed by their instant (`at`), so the lag of a poll is a visible gap, and a
// rail that runs over midnight is still in order. The labels are the entries' own (their minutes and seconds).
import { formatAge } from '@/lib/format/time';
import type { ActorKind, LedgerEntry } from '../types';

/** The axis runs from 4 % to 96 % of its width, leaving room for the end labels. */
const PAD = 4;
const WIDTH = 92;

export interface AxisPoint {
  /** Percent from the left. */
  x: number;
  kind: ActorKind;
  /** "20:03 guardrail": minutes, seconds and the first word of the actor ("09:20 guardrail", hours and minutes, over an hour). */
  label: string;
  /** Labels alternate between two rows so neighbours do not collide. */
  row: 1 | 2;
  edge: 'first' | 'last' | null;
}

export interface AxisGap {
  left: number;
  width: number;
  /** Where the caption sits. */
  mid: number;
  /** "Belay 12 s late", "Belay 1 h late". */
  label: string;
}

export interface Axis {
  points: AxisPoint[];
  gap: AxisGap | null;
  /** Seconds from first to last event. */
  span: number;
}

/** A rail of more than an hour needs the hour to tell its events apart: "09:20" over a span of hours, else "20:03". */
const clock = (t: string, span: number): string => (span > 3600 ? t.slice(0, 5) : t.slice(3));

/**
 * Lay out timed events (at least two) on the axis, oldest first whatever order they came in. The first Belay poll after
 * another event draws the gap.
 */
export function layoutAxis(entries: readonly LedgerEntry[]): Axis {
  const events = [...entries].sort((a, b) => a.at - b.at);
  const secs = events.map((e) => e.at / 1000);
  const lo = Math.min(...secs);
  const hi = Math.max(...secs);
  const span = Math.max(1, Math.round(hi - lo));
  const x = (s: number) => PAD + ((s - lo) / Math.max(1, hi - lo)) * WIDTH;

  const points = events.map((e, i): AxisPoint => ({
    x: x(secs[i] ?? lo),
    kind: e.kind,
    label: `${clock(e.t, span)} ${e.actor.split(' ')[0] ?? ''}`,
    row: i % 2 ? 2 : 1,
    edge: i === 0 ? 'first' : i === events.length - 1 ? 'last' : null,
  }));

  let gap: AxisGap | null = null;
  const bi = events.findIndex((e) => e.kind === 'belay');
  if (bi > 0) {
    const from = secs[bi - 1] ?? lo;
    const to = secs[bi] ?? hi;
    const a = x(from);
    const b = x(to);
    gap = { left: a, width: b - a, mid: (a + b) / 2, label: `Belay ${formatAge(to - from)} late` };
  }
  return { points, gap, span };
}
