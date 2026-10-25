// A Grinex-Portal-shaped project for the Vitals tests: the saved config, its CI runs, prod bins and adjustments, typed
// against src/schemas/vitals so a contract change breaks here first. Invented figures, no names or emails; the clock
// is fixed (NOW) so every age and window is deterministic.
import type { AdjustmentLine, CiRun, CiStage, DeployMarker, ProdPoint, ProdSignal, ProjectConfig } from '@/schemas/vitals';

export const NOW = '2026-10-25T12:00:00.000Z';
const MIN = 60_000;
const at = (ms: number): string => new Date(ms).toISOString();
const nowMs = Date.parse(NOW);

export const PROJECT: ProjectConfig = {
  slug: 'grinex-portal',
  name: 'Grinex Portal',
  root: 'C:/work/grinex-portal',
  onboardedAt: '2026-10-20T09:00:00.000Z',
  engine: { model: 'claude-sonnet-5-5', effort: 'low' },
  host: { kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal', repo: 'Grinex Portal' },
  components: [
    { id: 'portal', path: '.', stack: 'dotnet' },
    { id: 'release-log', path: 'release-log', stack: 'node', tests: ['npm test'] },
  ],
  ci: {
    provider: 'azure-pipelines',
    pipelines: [
      { id: '2', name: 'Grinex Portal', file: 'azure-pipelines.yml' },
      { id: '4', name: 'Grinex Portal PR', file: 'pipelines/pr-validation.yml' },
    ],
    variants: [
      { id: 'master-full', pipelineId: '2', match: { branch: 'master', reason: ['individualCI'] } },
      { id: 'master-hotfix', pipelineId: '2', match: { branch: 'master', parameter: { name: 'LANE', value: 'hotfix' } } },
      { id: 'pr-feature', pipelineId: '4', match: { branch: 'feature/*' } },
      { id: 'nightly', pipelineId: '2', match: { reason: ['schedule'] } },
    ],
  },
  cloud: { provider: 'azure-app-insights', resource: { appId: '00000000-0000-0000-0000-000000000000', name: 'grinex-portal-ai', resourceGroup: 'rg-portal', subscription: 'sub-portal' } },
  probes: [{ kind: 'az-login', args: {}, status: 'ok', summary: 'logged in', at: '2026-10-20T09:00:00.000Z', ms: 900 }],
};

export const NO_CLOUD: ProjectConfig = { ...PROJECT, slug: 'release-log', name: 'release-log', cloud: { provider: 'none' } };

/** Stages back to back from `start`, each [name, minutes, result]; a minutes of null is a stage still running. */
function stages(start: number, plan: readonly (readonly [string, number | null, CiStage['result']])[]): { stages: CiStage[]; end: number } {
  let t = start;
  const out = plan.map(([name, min, result]): CiStage => {
    const s: CiStage = { name, result, startedAt: at(t), jobs: [] };
    if (min !== null) {
      t += min * MIN;
      s.finishedAt = at(t);
    }
    return s;
  });
  return { stages: out, end: t };
}

function run(id: number, variant: string | undefined, hoursAgo: number, plan: Parameters<typeof stages>[1], result: CiRun['result'], branch = 'master'): CiRun {
  const start = nowMs - hoursAgo * 3_600_000;
  const s = stages(start, plan);
  const r: CiRun = {
    key: `azure-pipelines:${id}`,
    provider: 'azure-pipelines',
    pipelineId: variant === 'pr-feature' ? '4' : '2',
    pipelineName: variant === 'pr-feature' ? 'Grinex Portal PR' : 'Grinex Portal',
    runId: String(id),
    branch,
    reason: 'individualCI',
    sha: `sha${id}`,
    result,
    startedAt: at(start),
    stages: s.stages,
    fetchedAt: at(nowMs - 5 * MIN),
  };
  if (result !== 'running') r.finishedAt = at(s.end);
  if (variant) r.variant = variant;
  return r;
}

const full = (build: number, e2e: number, tests: number, ok = true) =>
  [['Build', build, 'succeeded'], ['E2E', e2e, 'succeeded'], ['Run Tests', tests, ok ? 'succeeded' : 'failed'], ['Swap', 2, 'succeeded']] as const;

/** master-full: four finished (one failed), one running, one canceled. pr-feature: three. One unclassified. nightly: none. */
export const RUNS: CiRun[] = [
  run(901, 'master-full', 96, full(30, 14, 140), 'succeeded'),
  run(902, 'master-full', 72, full(31, 15, 144, false), 'failed'),
  run(903, 'master-full', 48, full(32, 15, 150), 'succeeded'),
  run(904, 'master-full', 24, full(31, 15, 144), 'succeeded'),
  run(905, 'master-full', 1, [['Build', 20, 'succeeded'], ['E2E', null, 'running']], 'running'),
  run(906, 'master-full', 3, [['Build', 5, 'canceled']], 'canceled'),
  run(910, 'master-hotfix', 30, [['Build', 12, 'succeeded'], ['Swap', 2, 'succeeded']], 'succeeded'),
  run(920, 'pr-feature', 50, [['Build', 10, 'succeeded'], ['Unit', 6, 'succeeded']], 'succeeded', 'feature/login'),
  run(921, 'pr-feature', 40, [['Build', 11, 'succeeded'], ['Unit', 8, 'succeeded']], 'succeeded', 'feature/login'),
  run(922, 'pr-feature', 20, [['Build', 12, 'succeeded'], ['Unit', 7, 'failed']], 'failed', 'feature/cart'),
  run(930, undefined, 10, [['Build', 9, 'succeeded']], 'succeeded', 'spike/try'),
];

export const MARKERS: DeployMarker[] = [
  { runId: '904', stage: 'Swap', at: at(nowMs - 24 * 3_600_000 + 190 * MIN), sha: 'sha904' },
  { runId: '800', stage: 'Swap', at: at(nowMs - 9 * 24 * 3_600_000), sha: 'sha800' },
];

const BASE: Record<ProdSignal, [value: number, n: number]> = {
  requests: [1200, 1200],
  'failed-rate': [0.008, 1200],
  'p95-ms': [640, 1200],
  exceptions: [3, 3],
  availability: [99.9, 12],
};

/** Hourly bins over the last 7 days for every signal, except the newest 30 h of availability (its test stopped). */
export const PROD: ProdPoint[] = (Object.keys(BASE) as ProdSignal[]).flatMap((signal) =>
  Array.from({ length: 168 }, (_, i) => {
    const binStart = at(nowMs - (168 - i) * 3_600_000);
    const [value, n] = BASE[signal];
    return { key: `${signal}:${binStart}`, signal, binStart, binMin: 60, value, n };
  }).filter((p) => !(p.signal === 'availability' && Date.parse(p.binStart) >= nowMs - 30 * 3_600_000)),
);

const sample = (n: number, median: number) => ({ n, median, spread: 0.04 });

export const ADJUSTMENTS: AdjustmentLine[] = [
  { type: 'claim', id: 'adj-1', at: '2026-10-21T10:00:00.000Z', by: 'agent', title: 'Split Run Tests across 4 agents', target: { kind: 'ci-stage', variant: 'master-full', stage: 'Run Tests' }, direction: 'down', expectedPct: 40, ref: { branch: 'belay/split-tests' }, agentValue: 62 },
  { type: 'measurement', id: 'adj-1', at: '2026-10-22T10:00:00.000Z', method: 'passive', base: sample(2, 144), head: sample(1, 90), verdict: 'inconclusive', tolerance: 0.05, reason: 'n below 3 on a side' },
  { type: 'measurement', id: 'adj-1', at: '2026-10-24T10:00:00.000Z', method: 'passive', base: sample(4, 144), head: sample(3, 88), verdict: 'credited', tolerance: 0.05, reason: 'head median 88 min vs base 144 min, -39%' },
  { type: 'claim', id: 'adj-2', at: '2026-10-22T10:00:00.000Z', by: 'agent', title: 'Cache the npm install', target: { kind: 'ci-stage', variant: 'pr-feature', stage: 'Build' }, direction: 'down', ref: { mr: '!12' }, agentValue: 4 },
  { type: 'measurement', id: 'adj-2', at: '2026-10-23T10:00:00.000Z', method: 'queued', base: sample(3, 11), head: sample(3, 10.8), verdict: 'not-earned', tolerance: 0.05, reason: 'head median 10.8 min vs base 11 min, -2%' },
  { type: 'claim', id: 'adj-3', at: '2026-10-23T10:00:00.000Z', by: 'person', title: 'Warm the app before swap', target: { kind: 'prod-signal', signal: 'p95-ms' }, direction: 'down', ref: {} },
  { type: 'measurement', id: 'adj-3', at: '2026-10-24T11:00:00.000Z', method: 'passive', base: sample(1, 640), head: sample(1, 600), verdict: 'inconclusive', tolerance: 0.05, reason: 'n below 3 on a side' },
  { type: 'claim', id: 'adj-5', at: '2026-10-23T12:00:00.000Z', by: 'agent', title: 'Trim the Docker context', target: { kind: 'ci-stage', variant: 'master-full', stage: 'Build' }, direction: 'down', ref: { branch: 'belay/trim' } },
  { type: 'measurement', id: 'adj-5', at: '2026-10-24T12:00:00.000Z', method: 'passive', base: { n: 5, median: 31, spread: 0.4 }, head: { n: 5, median: 29, spread: 0.5 }, verdict: 'inconclusive', tolerance: 0.05, reason: 'spread above the change' },
  { type: 'claim', id: 'adj-4', at: '2026-10-24T10:00:00.000Z', by: 'agent', title: 'Drop the duplicate E2E smoke', target: { kind: 'ci-stage', variant: 'master-full', stage: 'E2E' }, direction: 'down', expectedPct: 20, ref: { sha: 'abc1234' }, agentValue: 12 },
];
