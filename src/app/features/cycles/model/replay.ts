// Replay: day-0 rungs plus each cycle's verdicts give the rungs after every cycle. Pure; the whole history is
// re-derived on every render, so the screen never shows a number the changes do not add up to.
import { STAGES, type Stage } from '@/schemas/stages';
import type { Cycle, CycleChange, CycleSummary, HeatCell, Rungs } from './types';

/** The verdicts that move a rung at the closing rescan. Everything else leaves it where it was. */
const MOVES: ReadonlySet<CycleChange['verdict']> = new Set(['credited', 'resolved', 'regressed']);

export const moves = (c: CycleChange): boolean => MOVES.has(c.verdict);

/** The rungs after one cycle's closing rescan. A running or planned cycle moves nothing yet. */
export function applyCycle(before: Rungs, cycle: Cycle): Rungs {
  if (cycle.state !== 'closed') return before;
  const out: Record<Stage, number | null> = { ...before };
  for (const c of cycle.changes) if (moves(c)) out[c.stage] = c.to;
  return out;
}

/** [day 0, after the first cycle, ...]: one entry more than there are cycles. */
export function replay(day0: Rungs, cycles: readonly Cycle[]): Rungs[] {
  const out: Rungs[] = [day0];
  let at = day0;
  for (const c of cycles) out.push((at = applyCycle(at, c)));
  return out;
}

/** Sum of the known rungs (unknown counts as nothing, never as zero evidence). */
export const total = (r: Rungs): number => STAGES.reduce((n, s) => n + (r[s] ?? 0), 0);

/** The most a project can hold: four rungs on each of the nine stages. */
export const MAX_TOTAL = STAGES.length * 4;

/** One problem the replay found. */
export interface Break {
  cycle: string;
  stage: Stage;
  /** What went wrong, in one line. */
  text: string;
}

/**
 * The chain check: every moving change must start from the rung the replay holds at that moment. A change that
 * claims to lift R1 -> R2 on a stage replay says is at R0 is a break in the history.
 */
export function chainBreaks(day0: Rungs, cycles: readonly Cycle[]): Break[] {
  const out: Break[] = [];
  let at: Rungs = day0;
  for (const cy of cycles) {
    for (const c of cy.changes) {
      if (cy.state === 'closed' && c.from !== at[c.stage]) {
        out.push({ cycle: cy.id, stage: c.stage, text: `${c.mr ?? c.kind} starts at ${rungLabel(c.from)}; replay holds ${rungLabel(at[c.stage])}` });
      }
    }
    at = applyCycle(at, cy);
  }
  return out;
}

/** Stages where the replayed rungs disagree with a scan. Empty means the history reconciles with that scan. */
export function reconcile(replayed: Rungs, scanned: Rungs): Stage[] {
  return STAGES.filter((s) => replayed[s] !== scanned[s]);
}

export const rungLabel = (r: number | null): string => (r == null ? 'R?' : `R${r}`);

/** The stage x cycle grid. Column 0 is day 0; column i is after cycle i. */
export function heatGrid(day0: Rungs, cycles: readonly Cycle[]): Record<Stage, HeatCell[]> {
  const cols = replay(day0, cycles);
  const grid = {} as Record<Stage, HeatCell[]>;
  for (const s of STAGES) {
    grid[s] = cols.map((r, i) => {
      const prev = (cols[i - 1] ?? r)[s];
      const cy = i === 0 ? null : cycles[i - 1];
      const tried = !!cy?.changes.some((c) => c.stage === s && (c.verdict === 'rejected' || c.verdict === 'nolift'));
      return { rung: r[s], move: moveOf(prev, r[s]), tried };
    });
  }
  return grid;
}

function moveOf(prev: number | null, now: number | null): HeatCell['move'] {
  if (prev == null && now != null) return 'found';
  if (prev == null || now == null || prev === now) return 'same';
  return now > prev ? 'up' : 'down';
}

/**
 * The rung steps a change would add if it earns what it aims for. A probe on a known rung adds nothing (it only
 * turns an unknown into a known); a probe on an unknown adds the rung it finds.
 */
export function reach(c: CycleChange): number {
  if (c.kind === 'probe') return c.from == null ? c.to : 0;
  return Math.max(0, c.to - (c.from ?? 0));
}

/** The numbers for one cycle. `net` counts rung steps, so R0 -> R2 is 2. */
export function summarize(cycle: Cycle): CycleSummary {
  const s: CycleSummary = { sent: 0, credited: 0, missed: 0, regressed: 0, resolved: 0, net: 0 };
  for (const c of cycle.changes) {
    if (c.kind === 'mr' && c.mr) s.sent++;
    if (c.verdict === 'credited') {
      s.credited++;
      s.net += c.to - (c.from ?? 0);
    } else if (c.verdict === 'rejected' || c.verdict === 'nolift') s.missed++;
    else if (c.verdict === 'regressed') {
      s.regressed++;
      s.net -= (c.from ?? 0) - c.to;
    } else if (c.verdict === 'resolved') {
      s.resolved++;
      s.net += c.to;
    }
  }
  return s;
}
