// Local re-measure: a local-metric claim measured on the person's machine with the runner's own T3 measurement
// (runner/tech/measure.ts measureTech: a throwaway detached worktree, the project's setup in it, the metric's command,
// then the worktree removed). Base is the project's default branch, head the claim's ref.sha (else ref.branch). The
// metric is the project's runner.frontier metric of the claim's name; its command is the project's own, saved at
// onboarding, never one the claim names. Appends a Measurement with method 'local'.
import type { ProjectConfig } from '@/schemas/vitals';
import { loadProjects } from '@/server/discover';
import { defaultExec } from '@/server/providers/exec';
import type { Exec } from '@/server/providers/types';
import { measureTech, type Measured } from '../../../../runner/tech/measure';
import type { TechMetric } from '../../../../runner/index';
import { appendAdjustment } from '../store';
import { judgeSamples } from './judge';
import { claimOf, type MeasureAnswer } from './passive';

/** The seam the tests fake: measureTech's signature. */
export type MeasureTech = (repo: { path: string; setup?: string[] }, sha: string, metrics: readonly TechMetric[], runs: number, setupTimeoutMs: number) => Promise<Measured>;

const SETUP_TIMEOUT_MS = 30 * 60_000;
const BASE_RUNS = 2;
const HEAD_RUNS = 2;

/** The default branch as origin names it (origin/HEAD), else undefined: never guessed. */
export async function defaultBranch(root: string, exec: Exec = defaultExec): Promise<string | undefined> {
  const r = await exec('git', ['-C', root, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], { timeoutMs: 15_000 });
  const ref = r.code === 0 ? r.stdout.trim() : '';
  return ref ? ref : undefined;
}

export interface LocalDeps {
  measure?: MeasureTech;
  /** The base ref; read from git (origin/HEAD) when omitted. */
  base?: string;
  project?: ProjectConfig;
  now?: Date;
}

const values = (m: Measured): number[] => (m.series[0]?.values ?? []).filter((v): v is number => v != null);

export async function localMeasure(slug: string, claimId: string, deps: LocalDeps = {}): Promise<MeasureAnswer> {
  const cfg = deps.project ?? loadProjects().find((p) => p.slug === slug);
  if (!cfg) return { status: 'refused', reason: `no onboarded project "${slug}"` };
  const claim = claimOf(slug, claimId);
  if (typeof claim === 'string') return { status: 'refused', reason: claim };
  if (claim.target.kind !== 'local-metric' || !claim.target.metric) return { status: 'refused', reason: 'only a local-metric claim is measured locally' };
  const metrics = cfg.runner?.frontier?.metrics ?? [];
  const metric = metrics.find((m) => m.name === claim.target.metric);
  if (!cfg.runner) return { status: 'refused', reason: `${slug} has no runner block (gates, setup, frontier metrics) to measure with` };
  if (!metric) return { status: 'refused', reason: `${claim.target.metric} is not one of ${slug}'s frontier metrics (${metrics.map((m) => m.name).join(', ') || 'none'})` };
  const head = claim.ref.sha ?? claim.ref.branch;
  if (!head) return { status: 'refused', reason: 'the claim names no ref.sha or ref.branch to measure' };
  const base = deps.base ?? (await defaultBranch(cfg.root));
  if (!base) return { status: 'refused', reason: `${cfg.root} has no origin/HEAD to read the default branch from (git remote set-head origin --auto)` };
  const measure = deps.measure ?? measureTech;
  const repo = { path: cfg.root, ...(cfg.runner.setup?.length ? { setup: cfg.runner.setup } : {}) };
  const before = await measure(repo, base, [metric], BASE_RUNS, SETUP_TIMEOUT_MS);
  const after = await measure(repo, head, [metric], HEAD_RUNS, SETUP_TIMEOUT_MS);
  const red = before.setupRed ?? after.setupRed;
  if (red) return { status: 'refused', reason: `setup was red in the measurement worktree: ${red.split('\n')[0]}` };
  // A wall metric is a time: still not held to the CI floor of 3, since the runner measures each side twice by design.
  const j = judgeSamples(values(before), values(after), { direction: claim.direction, wall: false, unit: metric.parse.unit ?? (metric.parse.kind === 'wall' ? 's' : '') });
  const m = { type: 'measurement' as const, id: claim.id, at: (deps.now ?? new Date()).toISOString(), method: 'local' as const, base: j.base, head: j.head, verdict: j.verdict, tolerance: j.tolerance, reason: `${base} vs ${head}: ${j.reason}` };
  appendAdjustment(slug, m);
  return { status: 'measured', measurement: m };
}
