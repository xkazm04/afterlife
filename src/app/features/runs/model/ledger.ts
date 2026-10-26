// Ledger: every lane of every wave as one flat row, with the wave it ran in. Filter by outcome, sort by any column;
// a lane with no usage has no tokens or cost and sinks to the bottom of a figure sort (unknown is never 0).
import { compareText, sortItems, type SortState, type SortValue } from '@/components/table/model/sort';
import type { RunLane, RunRepo, RunWave } from '@/lib/runs/types';

export interface LedgerRow {
  lane: RunLane;
  wave: RunWave;
}

export type LedgerKey = 'title' | 'outcome' | 'wave' | 'tokens' | 'cost' | 'wall';
/** A lane's outcome, or open while it has no lane.end. */
export type LaneKind = 'landed' | 'parked' | 'failed' | 'budget' | 'timeout' | 'open';
export type LedgerFilter = 'all' | LaneKind;

export const LEDGER_INITIAL: SortState<LedgerKey> = { key: 'cost', dir: -1 };
export const ledgerDefaultDir = (k: LedgerKey): 1 | -1 => (k === 'title' || k === 'outcome' || k === 'wave' ? 1 : -1);

/** A lane's outcome as a filter kind: still open while it has no lane.end. */
export const kindOf = (l: RunLane): LaneKind => l.outcome ?? 'open';

export const ledgerRows = (repos: readonly RunRepo[]): LedgerRow[] => repos.flatMap((r) => r.waves.flatMap((wave) => wave.lanes.map((lane) => ({ lane, wave }))));

const FILTER_ORDER: readonly LaneKind[] = ['landed', 'failed', 'parked', 'budget', 'timeout', 'open'];

/** The filter's options: All, then each kind that has a lane, with its count. */
export function ledgerCounts(rows: readonly LedgerRow[]): { value: LedgerFilter; count: number }[] {
  const by = new Map<LaneKind, number>();
  for (const r of rows) by.set(kindOf(r.lane), (by.get(kindOf(r.lane)) ?? 0) + 1);
  return [{ value: 'all', count: rows.length }, ...FILTER_ORDER.flatMap((k) => { const n = by.get(k) ?? 0; return n ? [{ value: k, count: n }] : []; })];
}

const valueOf = (r: LedgerRow, k: LedgerKey): SortValue => {
  switch (k) {
    case 'title':
      return r.lane.title ?? r.lane.lane;
    case 'outcome':
      return kindOf(r.lane);
    case 'wave':
      return `${r.wave.repo} ${String(r.wave.wave).padStart(6, '0')}`;
    case 'tokens':
      return r.lane.tokens;
    case 'cost':
      return r.lane.costUsd;
    case 'wall':
      return r.lane.wallSec;
  }
};

/** The rows the table shows: narrowed to one wave and/or an outcome, in the sort's order (ties: repo, newest wave). */
export function ledgerView(rows: readonly LedgerRow[], filter: LedgerFilter, sort: SortState<LedgerKey>, waveOnly?: RunWave): LedgerRow[] {
  const kept = rows.filter((r) => (filter === 'all' || kindOf(r.lane) === filter) && (!waveOnly || r.wave === waveOnly));
  return sortItems(kept, sort, { getValue: valueOf, tiebreak: (a, b) => compareText(a.wave.repo, b.wave.repo) || b.wave.wave - a.wave.wave });
}
