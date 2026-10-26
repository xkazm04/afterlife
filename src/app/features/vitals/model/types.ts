// What the Vitals screens draw, computed on the server from the stored measurements (data/loadVitals.ts), so the
// client receives rows, never the whole run history. Plain values: they cross from server to client. Absent = omitted.
import type { AdjustmentClaim, CiResult, CloudConfig, Measurement, ProbeResult, ProdSignal } from '@/schemas/vitals';

/** One row of /vitals from its config alone (the list's config slice). */
export interface ProjectRow {
  slug: string;
  name: string;
  root: string;
  /** "azure-devops · Grinex/Grinex Portal" or the host kind alone. */
  host: string;
  ci: string;
  cloud: string;
}

/** What a project's stored CI runs say of it (the list's runs slice, per slug). */
export interface RunsCell {
  /** Newest fetchedAt of the stored runs; omitted when nothing was collected yet. */
  lastCollected?: string;
  runsStored: number;
}

/** One row of /vitals: a real project Afterlife watches. */
export type ProjectSummary = ProjectRow & RunsCell;

/** The project page's config part (its config slice). */
export interface VitalsConfig {
  slug: string;
  name: string;
  root: string;
  host: string;
  ci: string;
  cloud: CloudConfig;
}

/** The project page's CI part (its ci slice): the Delivery band and the collect's freshness. */
export interface VitalsCi extends RunsCell {
  delivery: VariantRow[];
}

export interface StageStat {
  name: string;
  /** Counted runs that timed this stage. */
  n: number;
  medianMs?: number;
  p90Ms?: number;
}

export interface RunLine {
  runId: string;
  branch: string;
  result: CiResult;
  startedAt: string;
  /** Omitted while the run is running, has no finishedAt, or was canceled (listed, not counted). */
  durationMs?: number;
  stages: { name: string; result: CiResult; ms?: number }[];
}

/** One Delivery row: a variant (or the runs no variant matched, "unclassified"). */
export interface VariantRow {
  id: string;
  /** The pipeline names behind this row, comma-joined. */
  pipeline: string;
  /** Every run listed, running and canceled ones too. */
  runs: number;
  /** Runs whose duration counts. */
  counted: number;
  medianMs?: number;
  p90Ms?: number;
  /** failed / (succeeded + failed + partial); omitted when no run finished. 0..1. */
  failureRate?: number;
  slowestStage?: { name: string; medianMs: number };
  /** The last 30 counted durations in minutes, oldest first. */
  trend: number[];
  stages: StageStat[];
  /** Newest first, at most LAST_RUNS. */
  last: RunLine[];
  /** A configured rule no stored run matched yet. */
  noRuns?: true;
}

export interface Marker {
  runId: string;
  stage: string;
  at: string;
  /** 0..1 across the trend window. */
  x: number;
}

export interface SignalRow {
  signal: ProdSignal;
  label: string;
  /** The last 24 h's figure; omitted when no bin fell in it. */
  last24?: number;
  /** The sample behind last24 (requests, availability tests). */
  n24: number;
  /** 28 cells of 6 h over the last 7 days, oldest first; null is a cell with no bin. */
  trend: (number | null)[];
  markers: Marker[];
}

export type AdjustmentState = 'proposed' | 'measuring' | 'credited' | 'not-earned' | 'inconclusive';

export interface AdjustmentRow {
  claim: AdjustmentClaim;
  state: AdjustmentState;
  /** The latest measurement of this claim; omitted while none exists. */
  measurement?: Measurement;
  measurements: number;
  /** How Afterlife can re-measure it here (model/adjustments remeasureOf); omitted when it cannot. */
  remeasure?: Remeasure;
}

/** passive: from the variant's natural runs. queue: the pipeline and branch a queue-runs write would use. local: a frontier metric. */
export interface Remeasure {
  passive?: true;
  queue?: { pipelineId: string; branch: string };
  local?: true;
}

export interface VitalsView extends VitalsConfig, VitalsCi {
  /** Omitted when no cloud is connected (cloud.provider 'none'). */
  production?: SignalRow[];
  adjustments: AdjustmentRow[];
  /** The server's clock when this was read (ISO): every age on the screen is measured from it. */
  now: string;
  /** This server's collect job for the project (data/jobs.ts); omitted when none ran since it started. */
  job?: CollectJob;
}

/** One background collect: running while `done` is omitted; then what it added, or `error` with why it failed. */
export interface CollectJob {
  startedAt: string;
  done?: string;
  error?: string;
  added?: number;
  total?: number;
  prodAdded?: number;
  probes?: ProbeResult[];
}

/** What Refresh (data/actions.ts refreshVitals) answers at once: the job it started (or the one still running), or why not. */
export type RefreshResult = { ok: true; job: CollectJob } | { ok: false; error: string };

/** What a passive or local re-measure answered: in words, or why it did not run. */
export type RemeasureResult = { ok: true; message: string } | { ok: false; error: string };
