// Production: the stored hourly App Insights bins folded into one row per signal - the last 24 h's figure and a 7-day
// trend of 6-hour cells, with the deploys (DeployMarker) placed on that trend. Pure: points, markers and `now` in.
// Counts (requests, exceptions) add up over a window; rates and latencies (failed rate, p95, availability) are the
// mean of the bins weighted by each bin's sample n, so a quiet night hour weighs less than a busy noon one.
import type { DeployMarker, ProdPoint, ProdSignal } from '@/schemas/vitals';
import type { Marker, SignalRow } from './types';

export const SIGNALS: readonly ProdSignal[] = ['requests', 'failed-rate', 'p95-ms', 'exceptions', 'availability'];
export const SIGNAL_LABEL: Record<ProdSignal, string> = {
  requests: 'Requests',
  'failed-rate': 'Failed rate',
  'p95-ms': 'p95 duration',
  exceptions: 'Exceptions',
  availability: 'Availability',
};
const SUMMED: ReadonlySet<ProdSignal> = new Set(['requests', 'exceptions']);

const HOUR = 3_600_000;
export const WINDOW_MS = 7 * 24 * HOUR;
export const CELL_MS = 6 * HOUR;
export const CELLS = WINDOW_MS / CELL_MS;

/** One window's figure for a signal: the sum for a count, the n-weighted mean otherwise (a plain mean when no n). */
export function aggregate(signal: ProdSignal, points: readonly ProdPoint[]): number | undefined {
  if (!points.length) return undefined;
  if (SUMMED.has(signal)) return points.reduce((a, p) => a + p.value, 0);
  const n = points.reduce((a, p) => a + p.n, 0);
  if (n > 0) return points.reduce((a, p) => a + p.value * p.n, 0) / n;
  return points.reduce((a, p) => a + p.value, 0) / points.length;
}

/** Where each deploy sits on a window ending at `now`: 0 its left edge, 1 now. A deploy outside it is not drawn. */
export function placeMarkers(markers: readonly DeployMarker[], nowMs: number, windowMs = WINDOW_MS): Marker[] {
  const start = nowMs - windowMs;
  return markers
    .map((m) => ({ runId: m.runId, stage: m.stage, at: m.at, x: (Date.parse(m.at) - start) / windowMs }))
    .filter((m) => Number.isFinite(m.x) && m.x >= 0 && m.x <= 1)
    .sort((a, b) => a.x - b.x);
}

export function signalRow(signal: ProdSignal, points: readonly ProdPoint[], markers: readonly DeployMarker[], nowMs: number): SignalRow {
  const mine = points.filter((p) => p.signal === signal);
  const at = (p: ProdPoint): number => Date.parse(p.binStart);
  const day = mine.filter((p) => at(p) >= nowMs - 24 * HOUR && at(p) < nowMs);
  const start = nowMs - WINDOW_MS;
  const trend = Array.from({ length: CELLS }, (_, i) => {
    const lo = start + i * CELL_MS;
    return aggregate(signal, mine.filter((p) => at(p) >= lo && at(p) < lo + CELL_MS)) ?? null;
  });
  const row: SignalRow = { signal, label: SIGNAL_LABEL[signal], n24: day.reduce((a, p) => a + p.n, 0), trend, markers: placeMarkers(markers, nowMs) };
  const v = aggregate(signal, day);
  if (v !== undefined) row.last24 = v;
  return row;
}

export function productionRows(points: readonly ProdPoint[], markers: readonly DeployMarker[], nowMs: number): SignalRow[] {
  return SIGNALS.map((s) => signalRow(s, points, markers, nowMs));
}
