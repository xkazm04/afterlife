// The onboarding funnel: every project of the estate sits at one step, from discovered to in cycles. Pure.
import type { FleetProject } from '@/lib/demo/types';
import { STAGES, type Stage } from '@/schemas/stages';

/** The funnel, in order. A project at a step has passed every step before it. */
export const STEPS = ['discovered', 'baselined', 'paired', 'watching', 'cycling'] as const;
export type Step = (typeof STEPS)[number];

export const STEP_WORD: Record<Step, string> = {
  discovered: 'Discovered',
  baselined: 'Baselined',
  paired: 'Paired',
  watching: 'Watching',
  cycling: 'In cycles',
};

/** What reaching the step means, in one line. */
export const STEP_MEANS: Record<Step, string> = {
  discovered: 'listed by the group API: Afterlife knows it exists, nothing more',
  baselined: 'a read-only day-0 scan has rated its nine stages',
  paired: 'its bootstrap MR is merged: a policy record and the proof jobs live on main',
  watching: 'the poller reads it on every cycle and its feed is live',
  cycling: 'an improvement cycle runs on it: scan, pick, send, merge, prove, credit',
};

/** Projects already in a cycle history (the demo has one: the deep project). */
export type Cycling = ReadonlySet<string>;

/** Where a project stands. Unknown stages mean no baseline; a stale feed still counts as paired, never as watching. */
export function stepOf(p: FleetProject, cycling: Cycling): Step {
  if (p.state === 'not-set-up' || p.stages.every((s) => s == null)) return 'discovered';
  if (p.state === 'setting-up') return setupStepNumber(p) >= 11 ? 'paired' : 'baselined';
  if (p.state === 'stale') return 'paired';
  return cycling.has(p.id) ? 'cycling' : 'watching';
}

/** "step 10 of 14 · ..." -> 10; no step recorded -> 0 (the bootstrap is not merged). */
export function setupStepNumber(p: FleetProject): number {
  const m = /step (\d+)/.exec(p.setupStep ?? '');
  return m ? Number(m[1]) : 0;
}

export const rank = (s: Step): number => STEPS.indexOf(s);

/** How many projects have reached each step (cumulative: a watched project also counts as baselined). */
export function funnel(steps: Readonly<Record<string, Step>>): Record<Step, number> {
  const out = Object.fromEntries(STEPS.map((s) => [s, 0])) as Record<Step, number>;
  for (const s of Object.values(steps)) for (const t of STEPS) if (rank(s) >= rank(t)) out[t]++;
  return out;
}

export interface GroupProgress {
  group: string;
  total: number;
  /** Projects sitting at each step (not cumulative), for a stacked bar. */
  at: Record<Step, number>;
}

/** Per group, how many projects sit at each step, in the order the groups are listed. */
export function byGroup(projects: readonly FleetProject[], groups: readonly string[], steps: Readonly<Record<string, Step>>): GroupProgress[] {
  return groups.map((group) => {
    const at = Object.fromEntries(STEPS.map((s) => [s, 0])) as Record<Step, number>;
    const mine = projects.filter((p) => p.group === group);
    for (const p of mine) {
      const s = steps[p.id];
      if (s) at[s]++;
    }
    return { group, total: mine.length, at };
  });
}

/** One stage of the estate baseline: how many projects stand on each rung, and how many are not rated. */
export interface BaselineRow {
  stage: Stage;
  /** Counts for R0..R4. */
  rungs: [number, number, number, number, number];
  unknown: number;
  /** The median rung of the rated projects; null when none is rated. */
  median: number | null;
}

/** The estate's day-0 picture, stage by stage, over every project with a baseline. Unknown is counted, never zero. */
export function baseline(projects: readonly FleetProject[]): BaselineRow[] {
  return STAGES.map((stage, i) => {
    const rungs: BaselineRow['rungs'] = [0, 0, 0, 0, 0];
    const rated: number[] = [];
    let unknown = 0;
    for (const p of projects) {
      const r = p.stages[i];
      if (r == null) unknown++;
      else {
        rungs[r] = (rungs[r] ?? 0) + 1;
        rated.push(r);
      }
    }
    rated.sort((a, b) => a - b);
    return { stage, rungs, unknown, median: rated.length ? (rated[Math.floor((rated.length - 1) / 2)] ?? null) : null };
  });
}

/** The stage the estate is weakest on: the lowest median, ties to the one with the most projects at R0. */
export function weakest(rows: readonly BaselineRow[]): BaselineRow | null {
  const rated = rows.filter((r) => r.median != null);
  if (!rated.length) return null;
  return [...rated].sort((a, b) => (a.median ?? 0) - (b.median ?? 0) || b.rungs[0] - a.rungs[0])[0] ?? null;
}
