// What Afterlife measured on a real project, stored append-only and idempotent by `key` under
// <data>/vitals/<slug>/: ci-runs.jsonl, prod.jsonl and adjustments.jsonl. Absent values are omitted keys.

export type CiResult = 'succeeded' | 'failed' | 'canceled' | 'partial' | 'running';

export interface CiJob {
  name: string;
  result: CiResult;
  startedAt?: string;
  finishedAt?: string;
}

export interface CiStage {
  name: string;
  result: CiResult;
  startedAt?: string;
  finishedAt?: string;
  jobs: CiJob[];
}

/** One pipeline run, with its stages and jobs (Azure: the build timeline; GitLab: the pipeline's jobs by stage). */
export interface CiRun {
  /** `${provider}:${runId}` - the idempotency key. */
  key: string;
  provider: 'azure-pipelines' | 'gitlab-ci';
  pipelineId: string;
  pipelineName: string;
  runId: string;
  /** Short branch name (refs/heads/ stripped). */
  branch: string;
  /** The provider's trigger reason, verbatim. */
  reason: string;
  sha: string;
  result: CiResult;
  startedAt: string;
  finishedAt?: string;
  /** The VariantRule id that matched (vitals/variants.ts); omitted when none did. */
  variant?: string;
  /** Run parameters the variant rules may read (Azure template parameters / variables). */
  parameters?: Record<string, string>;
  stages: CiStage[];
  fetchedAt: string;
}

export type ProdSignal = 'requests' | 'failed-rate' | 'p95-ms' | 'exceptions' | 'availability';

/** One binned production value (App Insights KQL, 60-minute bins). */
export interface ProdPoint {
  /** `${signal}:${binStart}`. */
  key: string;
  signal: ProdSignal;
  binStart: string;
  binMin: number;
  value: number;
  /** Sample size behind the value (request count, availability test count). */
  n: number;
}

/** A deploy as seen in CI: a succeeded stage named like swap/deploy, drawn as a marker on the production band. */
export interface DeployMarker {
  runId: string;
  stage: string;
  at: string;
  sha: string;
}

export type AdjustmentTargetKind = 'ci-stage' | 'ci-run' | 'local-metric' | 'prod-signal';

/** What a dev agent (through `afterlife report`) or a person says a change will move. Never itself evidence. */
export interface AdjustmentClaim {
  type: 'claim';
  id: string;
  at: string;
  by: 'agent' | 'person';
  title: string;
  target: { kind: AdjustmentTargetKind; variant?: string; stage?: string; metric?: string; signal?: ProdSignal };
  direction: 'down' | 'up';
  expectedPct?: number;
  ref: { branch?: string; sha?: string; mr?: string };
  /** The agent's own figure: shown beside the measurement, never used in the verdict. */
  agentValue?: number;
}

export type MeasureMethod = 'queued' | 'passive' | 'local';
export type MeasureVerdict = 'credited' | 'not-earned' | 'inconclusive';

export interface Sample {
  n: number;
  median: number;
  /** (max - min) / median over the samples; 0 for one sample. */
  spread: number;
}

/** Afterlife's own re-measurement of a claim; `id` is the claim's id. */
export interface Measurement {
  type: 'measurement';
  id: string;
  at: string;
  method: MeasureMethod;
  base: Sample;
  head: Sample;
  verdict: MeasureVerdict;
  /** The tolerance the verdict used (bench-delta rules: default 0.05, ceiling 0.10). */
  tolerance: number;
  /** Why, in one line: "head median 38.2 min vs base 44.0 min, -13%". */
  reason: string;
}

export type AdjustmentLine = AdjustmentClaim | Measurement;
