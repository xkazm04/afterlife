// The Cycles screen's own types. The domain (a cycle, its changes, verdicts) lives with the data: @/lib/demo/cycleTypes.
import type { Stage } from '@/schemas/stages';

export { PHASES, type Phase, type Verdict, type ChangeKind, type CycleChange, type CycleState, type Cycle, type CycleHistory } from '@/lib/demo/cycleTypes';

/** A rung per stage; null = unknown (never zero). */
export type Rungs = Readonly<Record<Stage, number | null>>;

/** One cell of the stage x cycle grid. */
export interface HeatCell {
  rung: number | null;
  /** How the cell differs from the column before it. */
  move: 'up' | 'down' | 'same' | 'found';
  /** A change was tried on this stage in this cycle but did not lift it (rejected or no lift). */
  tried: boolean;
}

/** Totals for one cycle, as the inspector and the sidebar show them. */
export interface CycleSummary {
  sent: number;
  credited: number;
  /** Rejected plus no-lift: changes that did not earn their rung. */
  missed: number;
  regressed: number;
  resolved: number;
  /** Net rung steps the cycle added (credited lifts + resolved, minus regressions). */
  net: number;
}
