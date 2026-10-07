// Everything the Cycles screen draws, built once from the Maturity data and the closed history. Pure.
import type { DemoData } from '@/lib/demo/types';
import { STAGES, type Stage } from '@/schemas/stages';
import { openCycles } from './plan';
import { chainBreaks, reconcile, replay, type Break } from './replay';
import type { Cycle, Rungs } from './types';

export interface CyclesData {
  project: string;
  engine: string;
  /** The latest scan's clock ("14:02"): the one that closed the last cycle. */
  scannedAt: string;
  day0: Rungs;
  /** The rungs that scan found. */
  scanned: Rungs;
  /** The rung each stage reaches for next. */
  next: Rungs;
  /** Closed cycles, then the running one, then the planned one. */
  cycles: Cycle[];
  today: number;
  cadence: number;
  /** Stages where the replayed history disagrees with the scan (empty: it reconciles). */
  drift: Stage[];
  /** Changes that do not start where the replay holds the stage (empty: the chain holds). */
  breaks: Break[];
}

const rungsOf = (m: DemoData['maturity'], k: 'day0' | 'now' | 'next'): Rungs => {
  const out = {} as Record<Stage, number | null>;
  for (const s of STAGES) out[s] = m.rungs.find((r) => r.stage === s)?.[k] ?? null;
  return out;
};

export function buildCycles(
  maturity: DemoData['maturity'],
  closed: readonly Cycle[],
  meta: { project: string; today: number; cadence: number },
): CyclesData {
  const day0 = rungsOf(maturity, 'day0');
  const scanned = rungsOf(maturity, 'now');
  const { running, planned } = openCycles(closed, maturity.proposals, scanned, meta.today, meta.cadence);
  const cols = replay(day0, closed);
  return {
    project: meta.project,
    engine: maturity.engine,
    scannedAt: maturity.scannedAt,
    day0,
    scanned,
    next: rungsOf(maturity, 'next'),
    cycles: [...closed, running, planned],
    today: meta.today,
    cadence: meta.cadence,
    drift: reconcile(cols[cols.length - 1] ?? day0, scanned),
    breaks: chainBreaks(day0, closed),
  };
}
