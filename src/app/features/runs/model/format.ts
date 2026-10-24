// The words for a run's figures. An absent figure is a dash, never 0: "no usage reported" and "cost nothing" differ.
export const DASH = '-';

export const usd = (n: number | undefined): string => (n === undefined ? DASH : `$${n.toFixed(2)}`);

export function tokens(n: number | undefined): string {
  if (n === undefined) return DASH;
  // the k figure is rounded to a tenth, so 999 950 would read "1000.0k": from there it is a million
  if (n >= 999_950) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function wall(sec: number | undefined): string {
  if (sec === undefined) return DASH;
  const s = Math.round(sec); // round once, first: 59.6 is a minute, never "60s" (nor 119.7 "1m 60s")
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** A wave's wall time from its wave.start and wave.end stamps; absent (a dash) while either is missing or unreadable. */
export function spanSec(start: string | undefined, end: string | undefined): number | undefined {
  if (!start || !end) return undefined;
  const ms = Date.parse(end) - Date.parse(start);
  return Number.isFinite(ms) && ms >= 0 ? ms / 1000 : undefined;
}

export const pct = (n: number | undefined): string => (n === undefined ? DASH : `${Math.round(n * 100)}%`);

/** "2 landed, 1 parked": only the outcomes that happened, then lanes still open. */
export function outcomeWords(c: Record<string, number>, open: number): string {
  const parts = Object.entries(c).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
  if (open > 0) parts.push(`${open} open`);
  return parts.length ? parts.join(', ') : DASH;
}

