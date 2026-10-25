// What a CI claim is measured by, read off the stored runs: a ci-stage claim by that stage's duration, a ci-run claim
// by the run's. Only a succeeded run (or stage) with both instants counts: a failed or canceled one stopped early, so
// its time says nothing about the change. Minutes, two decimals.
import type { AdjustmentClaim, CiRun, VariantRule } from '@/schemas/vitals';
import { classifyVariant } from '../variants';

const minutes = (from?: string, to?: string): number | undefined => {
  if (!from || !to) return undefined;
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 600) / 100 : undefined;
};

/** The claim's value on one run, or undefined when the run does not time it. */
export function valueOf(claim: AdjustmentClaim, run: CiRun): number | undefined {
  const t = claim.target;
  if (t.kind === 'ci-run') return run.result === 'succeeded' ? minutes(run.startedAt, run.finishedAt) : undefined;
  if (t.kind !== 'ci-stage' || !t.stage) return undefined;
  const want = t.stage.toLowerCase();
  const st = run.stages.find((s) => s.name.toLowerCase() === want);
  return st?.result === 'succeeded' ? minutes(st.startedAt, st.finishedAt) : undefined;
}

/** Oldest first: run ids are numeric and grow with time on both providers; startedAt breaks a non-numeric tie. */
export function chronological(runs: readonly CiRun[]): CiRun[] {
  return [...runs].sort((a, b) => {
    const x = Number(a.runId);
    const y = Number(b.runId);
    if (Number.isFinite(x) && Number.isFinite(y) && x !== y) return x - y;
    return Date.parse(a.startedAt) - Date.parse(b.startedAt);
  });
}

/**
 * The claim's variant's finished runs, oldest first. With the project's rules each run is classified by them as they
 * are now (a run stored before a rule was renamed carries the old id), else by the variant stored on it.
 */
export function variantRuns(claim: AdjustmentClaim, runs: readonly CiRun[], rules?: readonly VariantRule[]): CiRun[] {
  const of = (r: CiRun) => (rules ? classifyVariant(r, [...rules]) : r.variant);
  return chronological(runs.filter((r) => r.result !== 'running' && of(r) === claim.target.variant));
}

/** Values of the runs that time the claim, in the order given. */
export function valuesOf(claim: AdjustmentClaim, runs: readonly CiRun[]): number[] {
  return runs.flatMap((r) => {
    const v = valueOf(claim, r);
    return v === undefined ? [] : [v];
  });
}

export const isCiClaim = (c: AdjustmentClaim): boolean => c.target.kind === 'ci-stage' || c.target.kind === 'ci-run';
