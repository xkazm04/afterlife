// Adjustments: what an agent or a person claimed a change would move, joined by id with Afterlife's own measurements of
// it. The claim never decides anything: the state comes from the latest measurement alone (the agent's figure is shown
// beside it, labelled, never in its place). Pure.
import type { AdjustmentClaim, AdjustmentLine, Measurement } from '@/schemas/vitals';
import type { AdjustmentRow, AdjustmentState } from './types';

/** A side needs this many samples before a wall-time verdict counts (bench-delta rules). */
export const MIN_SAMPLES = 3;

/**
 * proposed: no measurement yet. measuring: the latest one is inconclusive with a side still under MIN_SAMPLES, so more
 * runs are coming. Otherwise the latest measurement's verdict.
 */
export function stateOf(latest: Measurement | undefined): AdjustmentState {
  if (!latest) return 'proposed';
  if (latest.verdict === 'inconclusive' && Math.min(latest.base.n, latest.head.n) < MIN_SAMPLES) return 'measuring';
  return latest.verdict;
}

/** One row per claim, newest claim first; a measurement whose claim is not stored is dropped (it measures nothing shown). */
export function adjustmentRows(lines: readonly AdjustmentLine[]): AdjustmentRow[] {
  const claims = new Map<string, AdjustmentClaim>();
  const measured = new Map<string, Measurement[]>();
  for (const l of lines) {
    if (l.type === 'claim') claims.set(l.id, l);
    else measured.set(l.id, [...(measured.get(l.id) ?? []), l]);
  }
  return [...claims.values()]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((claim) => {
      const ms = [...(measured.get(claim.id) ?? [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const latest = ms.at(-1);
      const row: AdjustmentRow = { claim, state: stateOf(latest), measurements: ms.length };
      if (latest) row.measurement = latest;
      return row;
    });
}

/** "ci-stage Run Tests on master-full", "prod-signal p95-ms": what the claim says it moves. */
export function targetWords(t: AdjustmentClaim['target']): string {
  const what = t.stage ?? t.metric ?? t.signal;
  return [t.kind, what, t.variant ? `on ${t.variant}` : undefined].filter(Boolean).join(' ');
}

/** The measured change, head against base, as a signed share of the base median; undefined for a zero base. */
export function measuredPct(m: Measurement): number | undefined {
  return m.base.median ? ((m.head.median - m.base.median) / m.base.median) * 100 : undefined;
}
