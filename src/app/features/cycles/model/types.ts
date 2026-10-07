// The Cycles domain: one improvement round per cycle, replayed from day 0. Pure types, no React.
import type { Stage } from '@/schemas/stages';

/** The six phases every cycle walks, in order. A cycle closes only after Credit. */
export const PHASES = ['scan', 'pick', 'send', 'merge', 'prove', 'credit'] as const;
export type Phase = (typeof PHASES)[number];

/**
 * What became of one change at the cycle's closing rescan.
 * - credited: the rung moved and every credit check held (same engine, exercised, not detector-only).
 * - nolift: merged, but the rescan saw no exercised evidence; nothing moves, it carries forward.
 * - rejected: the change could not earn the rung (e.g. detector surface only); nothing moves.
 * - resolved: a read-only probe turned an unknown rung into a known one.
 * - regressed: drift, not a change: the closing rescan found a rung lower than the cycle opened with.
 * - pending / planned: the cycle is still running, or not yet started.
 */
export type Verdict = 'credited' | 'nolift' | 'rejected' | 'resolved' | 'regressed' | 'pending' | 'planned';

export type ChangeKind = 'mr' | 'probe' | 'drift';

export interface CycleChange {
  /** "!17"; null for drift and for a gap not yet sent. */
  mr: string | null;
  /** The Maturity gap id ("g1") when the change came from a proposal. */
  gap?: string;
  kind: ChangeKind;
  stage: Stage;
  /** Rung before (null = unknown) and the rung it targets (or, for drift, the rung the rescan found). */
  from: number | null;
  to: number;
  title: string;
  verdict: Verdict;
  /** One line: why the verdict, in the engine's words. */
  why: string;
  /** Diff size, when there is a diff. */
  lines?: number;
}

export type CycleState = 'closed' | 'running' | 'planned';

export interface Cycle {
  /** "C6". */
  id: string;
  n: number;
  /** What the round was about, in a few words. */
  theme: string;
  state: CycleState;
  /** Days since onboarding (day 0 is the first scan); closedDay is null until the closing rescan. */
  openedDay: number;
  closedDay: number | null;
  /** The scan engine; credit never crosses engine versions, so a cycle has exactly one. */
  engine: string;
  /** Where a running cycle stands; a closed one is at 'credit', a planned one at 'scan'. */
  phase: Phase;
  changes: readonly CycleChange[];
}

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
