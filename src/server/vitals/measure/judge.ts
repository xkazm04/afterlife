// Afterlife's verdict on a claim: the bench-delta rules (engine/proofs/checkers/benchDelta.ts) over the medians of two
// sets of raw samples, base before the change and head after it. The claim's own figure never reaches this file: the
// verdict reads the samples alone. In order:
//   a wall-time side with fewer than MIN_WALL_SAMPLES samples -> inconclusive (too few to say)
//   a side whose spread is above 2x the tolerance            -> inconclusive (noisy)
//   head better than base beyond the tolerance, in `direction` -> credited
//   anything else (within tolerance, or worse)                -> not-earned
import type { MeasureVerdict, Sample } from '@/schemas/vitals';
import { DEFAULT_MAX_TOLERANCE, DEFAULT_TOLERANCE } from '../../../../engine/proofs/checkers/benchDelta';

/** A wall-time side needs this many samples before a verdict counts (the Vitals screen's MIN_SAMPLES says the same). */
export const MIN_WALL_SAMPLES = 3;

export interface Judged {
  base: Sample;
  head: Sample;
  verdict: MeasureVerdict;
  tolerance: number;
  reason: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** n, median and spread ((max - min) / median; 0 for one sample or a zero median) of the finite samples. */
export function sampleOf(xs: readonly number[]): Sample {
  const ok = xs.filter((x) => Number.isFinite(x));
  if (!ok.length) return { n: 0, median: 0, spread: 0 };
  const m = median(ok);
  const spread = ok.length > 1 && m ? (Math.max(...ok) - Math.min(...ok)) / Math.abs(m) : 0;
  return { n: ok.length, median: round2(m), spread: round2(spread) };
}

/** The tolerance used: the default when none is given or it is not a fraction, never above the ceiling. */
export function toleranceOf(t?: number): number {
  if (t === undefined || !Number.isFinite(t) || t < 0) return DEFAULT_TOLERANCE;
  return Math.min(t, DEFAULT_MAX_TOLERANCE);
}

const pct = (x: number): string => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

/**
 * The verdict over raw samples. `wall` (the default): a wall-time target (ci-stage, ci-run, p95-ms), so a side under
 * MIN_WALL_SAMPLES is inconclusive; a local metric that reads the same value every run passes `wall: false`.
 */
export function judgeSamples(base: readonly number[], head: readonly number[], o: { direction: 'down' | 'up'; tolerance?: number; wall?: boolean; unit?: string }): Judged {
  const tolerance = toleranceOf(o.tolerance);
  const b = sampleOf(base);
  const h = sampleOf(head);
  const unit = o.unit ? ` ${o.unit}` : '';
  const said = `head median ${h.median}${unit} vs base ${b.median}${unit}`;
  const out = (verdict: MeasureVerdict, reason: string): Judged => ({ base: b, head: h, verdict, tolerance, reason });
  const floor = o.wall === false ? 1 : MIN_WALL_SAMPLES;
  if (b.n < floor || h.n < floor) return out('inconclusive', `too few samples: ${b.n} base / ${h.n} head (a side needs ${floor})`);
  const noisy = 2 * tolerance;
  if (b.spread > noisy || h.spread > noisy) {
    return out('inconclusive', `noisy: spread ${pct(b.spread).slice(1)} base / ${pct(h.spread).slice(1)} head is above ${pct(noisy).slice(1)}`);
  }
  if (!b.median) return out('inconclusive', 'the base median is 0: no change can be measured against it');
  const change = (h.median - b.median) / Math.abs(b.median);
  const better = o.direction === 'down' ? -change : change;
  if (better > tolerance) return out('credited', `${said}, ${pct(change)}: better beyond the ${pct(tolerance).slice(1)} tolerance`);
  if (better < -tolerance) return out('not-earned', `${said}, ${pct(change)}: worse`);
  return out('not-earned', `${said}, ${pct(change)}: within the ${pct(tolerance).slice(1)} tolerance`);
}

/** The barrel's `judge`: wall-time rules (every CI and prod target is one). */
export function judge(base: number[], head: number[], direction: 'down' | 'up', tolerance?: number): Judged {
  return judgeSamples(base, head, { direction, tolerance });
}
