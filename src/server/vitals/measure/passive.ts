// Passive re-measure: the natural runs of the claim's variant around its change. The change point is the first run
// whose commit holds ref.sha (the sha merged: git merge-base --is-ancestor in the project's own checkout, else the
// exact sha), or, with no sha, the first run on ref.branch. Base = the N runs before it that time the target, head =
// the first N from it. Both sides need MIN_WALL_SAMPLES before a Measurement is appended; until then the answer is
// "waiting: k of N after". Reads the stored runs only: nothing is queued, nothing is run but a local git read.
import type { AdjustmentClaim, CiRun, Measurement, VariantRule } from '@/schemas/vitals';
import { defaultExec } from '@/server/providers/exec';
import type { Exec } from '@/server/providers/types';
import { appendAdjustment, readAdjustments, readCiRuns } from '../store';
import { judgeSamples, MIN_WALL_SAMPLES } from './judge';
import { isCiClaim, valueOf, variantRuns } from './samples';

export type MeasureAnswer =
  | { status: 'measured'; measurement: Measurement }
  | { status: 'waiting'; after: number; of: number; message: string }
  | { status: 'refused'; reason: string };

/** Whether `ancestor` is in `sha`'s history; undefined when git cannot tell (a sha the checkout does not have). */
export type IsAncestor = (ancestor: string, sha: string) => Promise<boolean | undefined>;

export function gitAncestor(root: string, exec: Exec = defaultExec): IsAncestor {
  return async (ancestor, sha) => {
    if (!/^[0-9a-f]{7,40}$/i.test(ancestor) || !/^[0-9a-f]{7,40}$/i.test(sha)) return undefined;
    const r = await exec('git', ['-C', root, 'merge-base', '--is-ancestor', ancestor, sha], { timeoutMs: 15_000 });
    return r.code === 0 ? true : r.code === 1 ? false : undefined;
  };
}

/** The claim, or why it cannot be measured passively. */
export function claimOf(slug: string, claimId: string): AdjustmentClaim | string {
  const claim = readAdjustments(slug).find((l): l is AdjustmentClaim => l.type === 'claim' && l.id === claimId);
  if (!claim) return `no claim ${claimId} in ${slug}`;
  return claim;
}

/**
 * Index of the change point in `runs` (oldest first), or -1 while no run has it. A variant's runs follow one line of
 * history, so "holds ref.sha" is false then true along them: a binary search asks git about log2(n) commits only.
 */
export async function changeIndex(claim: AdjustmentClaim, runs: readonly CiRun[], all: readonly CiRun[], isAncestor?: IsAncestor): Promise<number> {
  const sha = claim.ref.sha?.toLowerCase();
  if (sha) {
    const exact = runs.findIndex((r) => r.sha.toLowerCase().startsWith(sha));
    if (isAncestor && runs.length) {
      let lo = 0;
      let hi = runs.length; // first index whose run holds sha, or runs.length
      let known = true;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const has = await isAncestor(sha, runs[mid]!.sha);
        if (has === undefined) { known = false; break; }
        if (has) hi = mid;
        else lo = mid + 1;
      }
      if (known) return lo < runs.length ? (exact >= 0 ? Math.min(exact, lo) : lo) : -1;
    }
    return exact;
  }
  const branch = claim.ref.branch;
  if (!branch) return -1;
  const own = runs.findIndex((r) => r.branch === branch);
  if (own >= 0) return own;
  // The variant does not run on the change's branch (master-full vs a feature branch): its first run there is the time.
  const first = all.filter((r) => r.branch === branch).map((r) => Date.parse(r.startedAt)).sort((a, b) => a - b)[0];
  return first === undefined ? -1 : runs.findIndex((r) => Date.parse(r.startedAt) >= first);
}

/** Base and head values around the change point: the last `n` before it and the first `n` from it that time the target. */
export function sides(claim: AdjustmentClaim, runs: readonly CiRun[], at: number, n: number): { base: number[]; head: number[] } {
  const vals = (rs: readonly CiRun[]) => rs.flatMap((r) => { const v = valueOf(claim, r); return v === undefined ? [] : [v]; });
  return { base: vals(runs.slice(0, at)).slice(-n), head: vals(runs.slice(at)).slice(0, n) };
}

export function measurementOf(claim: AdjustmentClaim, method: Measurement['method'], base: number[], head: number[], at: Date): Measurement {
  const j = judgeSamples(base, head, { direction: claim.direction, unit: 'min' });
  return { type: 'measurement', id: claim.id, at: at.toISOString(), method, base: j.base, head: j.head, verdict: j.verdict, tolerance: j.tolerance, reason: j.reason };
}

export async function passiveWith(slug: string, claimId: string, n: number, o: { isAncestor?: IsAncestor; now?: Date; rules?: readonly VariantRule[] } = {}): Promise<MeasureAnswer> {
  const claim = claimOf(slug, claimId);
  if (typeof claim === 'string') return { status: 'refused', reason: claim };
  if (!isCiClaim(claim)) return { status: 'refused', reason: `a ${claim.target.kind} claim is not measured from CI runs` };
  if (!claim.target.variant) return { status: 'refused', reason: 'the claim names no variant, so there are no runs to compare' };
  const all = readCiRuns(slug);
  const runs = variantRuns(claim, all, o.rules);
  const at = await changeIndex(claim, runs, all, o.isAncestor);
  const waiting = (k: number, why = ''): MeasureAnswer => ({ status: 'waiting', after: k, of: n, message: `waiting: ${k} of ${n} after${why}` });
  if (at < 0) return waiting(0, ' (no stored run of the variant has the change yet)');
  const { base, head } = sides(claim, runs, at, n);
  if (head.length < MIN_WALL_SAMPLES) return waiting(head.length);
  if (base.length < MIN_WALL_SAMPLES) return waiting(head.length, ` (only ${base.length} runs before the change time it)`);
  const m = measurementOf(claim, 'passive', base, head, o.now ?? new Date());
  appendAdjustment(slug, m);
  return { status: 'measured', measurement: m };
}
