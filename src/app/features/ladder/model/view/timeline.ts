// The to-scale "who acted" axis: events are placed by their real clock time, so the lag of a poll is a visible gap.
import { toSec } from '../clock';
import type { ActorKind, LedgerEntry } from '../types';

/** The axis runs from 4 % to 96 % of its width, leaving room for the end labels. */
const PAD = 4;
const WIDTH = 92;

export interface AxisPoint {
  /** Percent from the left. */
  x: number;
  kind: ActorKind;
  /** "20:03 guardrail": minutes, seconds and the first word of the actor. */
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
  /** "Belay 12 s late". */
  label: string;
}

export interface Axis {
  points: AxisPoint[];
  gap: AxisGap | null;
  /** Seconds from first to last event. */
  span: number;
}

const DAY_SEC = 86400;

/**
 * Clock times carry no date, and live entries are the last 24 h, so the ledger can run past midnight ("23:59:58" then
 * "00:00:03"). The ledger is oldest first: a time more than half a day before the one above it is the next day. A smaller
 * step back is clock skew between a job and a poll, and stays where it is.
 */
function unwrapDays(secs: readonly number[]): number[] {
  let days = 0;
  return secs.map((s, i) => {
    const before = secs[i - 1];
    if (before !== undefined && before - s > DAY_SEC / 2) days += 1;
    return s + days * DAY_SEC;
  });
}

/** Lay out timed events (at least two) on the axis. The first Belay poll after another event draws the gap. */
export function layoutAxis(events: readonly LedgerEntry[]): Axis {
  const secs = unwrapDays(events.map((e) => toSec(e.t)));
  const lo = Math.min(...secs);
  const hi = Math.max(...secs);
  const span = Math.max(1, hi - lo);
  const x = (s: number) => PAD + ((s - lo) / span) * WIDTH;

  const points = events.map((e, i): AxisPoint => ({
    x: x(secs[i] ?? lo),
    kind: e.kind,
    label: `${e.t.slice(3)} ${e.actor.split(' ')[0] ?? ''}`,
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
    gap = { left: a, width: b - a, mid: (a + b) / 2, label: `Belay ${to - from} s late` };
  }
  return { points, gap, span };
}
