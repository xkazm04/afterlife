// The figures a run's time is judged by: a run's and a stage's duration, the median and the p90 over a sample.
// An absent figure stays absent: a run still running, or one without finishedAt, has no duration, never 0.
import type { CiResult } from '@/schemas/vitals';

/** finishedAt - startedAt in ms; undefined while either is missing or unreadable, or the span runs backwards. */
export function spanMs(startedAt: string | undefined, finishedAt: string | undefined): number | undefined {
  if (!startedAt || !finishedAt) return undefined;
  const ms = Date.parse(finishedAt) - Date.parse(startedAt);
  return Number.isFinite(ms) && ms >= 0 ? ms : undefined;
}

/**
 * A run's duration as Delivery counts it: finished (not running, with finishedAt) and not canceled. A canceled run
 * stopped part way, so its time says nothing about how long the pipeline takes; it is listed, never counted.
 */
export function countedMs(run: { result: CiResult; startedAt: string; finishedAt?: string }): number | undefined {
  if (run.result === 'running' || run.result === 'canceled') return undefined;
  return spanMs(run.startedAt, run.finishedAt);
}

/** The middle value (the mean of the two middle ones for an even count); undefined for no values. */
export function median(values: readonly number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** The 90th percentile by nearest rank: the smallest value at or above 90% of the sample; undefined for no values. */
export function p90(values: readonly number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(0.9 * s.length) - 1)];
}
