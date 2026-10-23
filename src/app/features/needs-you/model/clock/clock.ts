// The CRA legal clock: arithmetic from a deadline. It never pauses and never goes below zero.
import { formatClock, pad2, splitDuration } from '@/lib/format/time';

/** Seconds left after `elapsedSec` have passed since the page showed `remainingSec`. */
export function secondsLeft(remainingSec: number, elapsedSec: number): number {
  return Math.max(0, remainingSec - Math.max(0, elapsedSec));
}

/** Hours, minutes and seconds as two-digit strings. Hours may pass 24. */
export function clockParts(sec: number): { h: string; m: string; s: string } {
  const { d, h, m, s } = splitDuration(sec);
  return { h: pad2(d * 24 + h), m: pad2(m), s: pad2(s) };
}

/** "19:11:59". */
export function clockText(sec: number): string {
  return formatClock(sec);
}

/** How much of the window has passed, 0 to 100, to two decimals. */
export function elapsedPercent(totalSec: number, leftSec: number): number {
  if (totalSec <= 0) return 100;
  const pct = (100 * (totalSec - leftSec)) / totalSec;
  return Math.round(Math.min(100, Math.max(0, pct)) * 100) / 100;
}

export interface RailTick {
  /** Position along the rail, 0 to 100. */
  pct: number;
  label: string;
  /** start and end align to the rail's edges; "mid" ticks hide on a narrow pane. */
  kind: 'start' | 'mid' | 'center' | 'end';
}

/** The rail's labels: "aware 09:10", +6 h, +12 h, +18 h, "due 09:10". */
export function railTicks(totalSec: number, awareAt: string, dueClock: string): readonly RailTick[] {
  const hours = totalSec / 3600;
  const steps = [0, 6, 12, 18].filter((h) => h < hours);
  const ticks: RailTick[] = steps.map((h) => ({
    pct: (h / hours) * 100,
    label: h === 0 ? `aware ${awareAt}` : `+${h} h`,
    kind: h === 0 ? 'start' : h === 12 ? 'center' : 'mid',
  }));
  ticks.push({ pct: 100, label: `due ${dueClock}`, kind: 'end' });
  return ticks;
}

/** The 72 h notification runs 48 h past the 24 h early warning, so its countdown moves with the same clock. */
export function notifyLine(leftSec: number): string {
  const { d, h, m } = splitDuration(leftSec + 48 * 3600);
  return `in ${d} d ${h} h ${m} m`;
}
