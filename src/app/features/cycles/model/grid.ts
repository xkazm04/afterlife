// The view model of the stage x cycle grid: one column for day 0 and one per cycle, the trajectory above it. Open
// cycles (running, planned) draw their targets as ghosts on top of the last replayed rung. Pure.
import { STAGES, type Stage } from '@/schemas/stages';
import { heatGrid, reach, summarize } from './replay';
import type { Cycle, CycleState, HeatCell, Rungs } from './types';

export interface GridColumn {
  /** "day0" or the cycle id. */
  key: string;
  label: string;
  /** "day 7" for a closed cycle, "now" for the running one, "next" for the planned one. */
  sub: string;
  state: CycleState | 'day0';
  /** Rungs held after this column (day 0 for the first). */
  total: number;
  /** For an open cycle: the total if every change in it and before it earns its rung. */
  projected: number | null;
  /** Net rung steps the cycle added; null for day 0 and open cycles. */
  net: number | null;
}

export interface GridCell extends HeatCell {
  /** An open cycle's target on this stage (the rung its change aims for), drawn as a ghost. */
  target: number | null;
}

export interface GridView {
  columns: GridColumn[];
  rows: { stage: Stage; cells: GridCell[] }[];
}

export function gridView(day0: Rungs, cycles: readonly Cycle[]): GridView {
  const closed = cycles.filter((c) => c.state === 'closed');
  const open = cycles.filter((c) => c.state !== 'closed');
  const heat = heatGrid(day0, closed);
  const last = (s: Stage): HeatCell | undefined => heat[s][heat[s].length - 1];
  const totals = heat[STAGES[0]].map((_, i) => STAGES.reduce((n, s) => n + (heat[s][i]?.rung ?? 0), 0));
  const held = totals[totals.length - 1] ?? 0;

  const columns: GridColumn[] = [
    { key: 'day0', label: 'Day 0', sub: 'first scan', state: 'day0', total: totals[0] ?? 0, projected: null, net: null },
    ...closed.map((c, i) => ({
      key: c.id, label: c.id, sub: `day ${c.closedDay}`, state: c.state, total: totals[i + 1] ?? 0, projected: null, net: summarize(c).net,
    })),
  ];
  let projected = held;
  for (const c of open) {
    projected += c.changes.reduce((n, ch) => n + reach(ch), 0);
    columns.push({ key: c.id, label: c.id, sub: c.state === 'running' ? 'now' : 'next', state: c.state, total: held, projected, net: null });
  }

  const rows = STAGES.map((stage) => ({
    stage,
    cells: [
      ...heat[stage].map((h) => ({ ...h, target: null })),
      ...open.map((c) => {
        const ch = c.changes.find((x) => x.stage === stage);
        return { rung: last(stage)?.rung ?? null, move: 'same' as const, tried: false, target: ch ? ch.to : null };
      }),
    ],
  }));
  return { columns, rows };
}
