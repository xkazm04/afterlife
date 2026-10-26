// The demo projects' CI runs, generated back from `now` so the Delivery band and the deploy markers always sit in the
// window drawn. ILLUSTRATIVE: every stage time and failure here is a placeholder for layout, not a measured run. Pure
// and deterministic: the same slug and clock give the same runs (a fixed wobble per run, no randomness).
import type { CiResult, CiRun, CiStage, ProjectConfig } from '@/schemas/vitals';

const MIN = 60_000;
const HOUR = 3_600_000;
const at = (ms: number): string => new Date(ms).toISOString();

/** One variant's runs: one every `everyH` hours back from now, each stage [name, minutes]. */
interface Plan {
  variant: string;
  reason: string;
  branches: readonly string[];
  everyH: number;
  count: number;
  stages: readonly (readonly [string, number])[];
  /** Run indexes (0 = oldest) whose second stage failed: the stages after it never ran. */
  failed?: readonly number[];
  /** The newest run is still running its second stage. */
  running?: true;
}

const MR = ['feature/fees-rounding', 'feature/statement-export', 'fix/idempotency-key'];
const MAIN = ['main'];

const PLANS: Record<string, readonly Plan[]> = {
  ledgerline: [
    { variant: 'main-full', reason: 'push', branches: MAIN, everyH: 20, count: 9, stages: [['build', 6], ['test', 14], ['scan', 4], ['staging', 3], ['deploy-production', 2]], failed: [4], running: true },
    { variant: 'mr-feature', reason: 'merge_request_event', branches: MR, everyH: 9, count: 18, stages: [['build', 5], ['test', 11], ['scan', 3]], failed: [6, 13] },
    { variant: 'nightly', reason: 'schedule', branches: MAIN, everyH: 24, count: 7, stages: [['build', 6], ['test', 22], ['e2e', 31]], failed: [2] },
  ],
  'ledgerline-web': [
    { variant: 'main-full', reason: 'push', branches: MAIN, everyH: 20, count: 8, stages: [['build', 4], ['test', 7], ['deploy', 2]] },
    { variant: 'mr-feature', reason: 'merge_request_event', branches: ['feature/review-app', 'fix/a11y-labels'], everyH: 11, count: 14, stages: [['build', 4], ['test', 6]], failed: [9] },
  ],
  'payments-gateway': [
    { variant: 'main-full', reason: 'push', branches: MAIN, everyH: 16, count: 10, stages: [['build', 7], ['test', 18], ['scan', 5], ['deploy', 3]], failed: [7] },
    { variant: 'mr-feature', reason: 'merge_request_event', branches: ['feature/sepa-instant', 'chore/bump-deps'], everyH: 10, count: 15, stages: [['build', 6], ['test', 15], ['scan', 4]] },
  ],
};

/** A fixed per-run wobble in [-0.1, 0.1], so the trend lines are not flat and the p90 sits above the median. */
const wobble = (i: number): number => (((i * 7919) % 21) - 10) / 100;

function stagesOf(p: Plan, i: number, start: number, last: boolean): { stages: CiStage[]; end: number; result: CiResult } {
  const failed = p.failed?.includes(i) ?? false;
  const running = last && !!p.running;
  const cut = failed || running ? 2 : p.stages.length;
  let t = start;
  const stages = p.stages.slice(0, cut).map(([name, min], k): CiStage => {
    const s: CiStage = { name, result: 'succeeded', startedAt: at(t), jobs: [] };
    if (running && k === 1) return { ...s, result: 'running' };
    t += Math.round(min * (1 + wobble(i + k)) * MIN);
    return { ...s, result: failed && k === 1 ? 'failed' : 'succeeded', finishedAt: at(t) };
  });
  return { stages, end: t, result: running ? 'running' : failed ? 'failed' : 'succeeded' };
}

/** A demo project's runs, oldest first per variant; none for a slug the demo estate does not have. */
export function demoRuns(cfg: ProjectConfig, nowMs: number): CiRun[] {
  const pipeline = cfg.ci.pipelines[0];
  if (!pipeline) return [];
  let id = Number(pipeline.id) * 1000;
  return (PLANS[cfg.slug] ?? []).flatMap((p) =>
    Array.from({ length: p.count }, (_, i): CiRun => {
      const last = i === p.count - 1;
      // the running one started moments ago; the rest one every everyH hours back from now
      const start = last && p.running ? nowMs - 25 * MIN : nowMs - (p.count - i) * p.everyH * HOUR + 40 * MIN;
      const s = stagesOf(p, i, start, last);
      const runId = String(++id);
      const run: CiRun = {
        key: `gitlab-ci:${runId}`,
        provider: 'gitlab-ci',
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        runId,
        branch: p.branches[i % p.branches.length] ?? 'main',
        reason: p.reason,
        sha: `demo${runId}`,
        result: s.result,
        startedAt: at(start),
        variant: p.variant,
        stages: s.stages,
        fetchedAt: at(nowMs - 7 * MIN),
      };
      if (s.result !== 'running') run.finishedAt = at(s.end);
      return run;
    }),
  );
}
