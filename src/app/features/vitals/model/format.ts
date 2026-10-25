// The words for the Vitals figures. An absent figure is a dash, never 0: "not measured" and "took no time" differ.
import type { ProdSignal } from '@/schemas/vitals';
import { formatAge, splitDuration } from '@/lib/format/time';

export const DASH = '-';

/** "31m", "2h 24m", "45s"; a dash when absent. */
export function dur(ms: number | undefined): string {
  if (ms === undefined) return DASH;
  const { d, h, m, s } = splitDuration(Math.round(ms / 1000));
  const hours = d * 24 + h;
  if (hours) return `${hours}h ${m}m`;
  return m ? `${m}m` : `${s}s`;
}

/** A 0..1 share as "12%"; a dash when absent. */
export const share = (v: number | undefined): string => (v === undefined ? DASH : `${Math.round(v * 100)}%`);

/** "+12%", "-8%": a signed percent; a dash when absent. */
export const signedPct = (v: number | undefined): string => (v === undefined ? DASH : `${v > 0 ? '+' : ''}${Math.round(v)}%`);

/** A production figure in its unit. failed-rate is a fraction (0..1) drawn as a percent; availability is a percent already. */
export function signalValue(signal: ProdSignal, v: number | undefined): string {
  if (v === undefined) return DASH;
  switch (signal) {
    case 'requests':
    case 'exceptions':
      return Math.round(v).toLocaleString('en-US');
    case 'p95-ms':
      return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
    case 'failed-rate':
      return `${(v * 100).toFixed(2)}%`;
    case 'availability':
      return `${v.toFixed(2)}%`;
  }
}

/** "12 m ago" from two ISO instants; "never" when nothing was collected. */
export function agoWords(at: string | undefined, now: string): string {
  if (!at) return 'never';
  const sec = (Date.parse(now) - Date.parse(at)) / 1000;
  return Number.isFinite(sec) ? `${formatAge(Math.max(0, sec))} ago` : DASH;
}
