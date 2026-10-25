// Raw GitLab pipeline + jobs JSON -> CiRun. A stage is the jobs' `stage` field: it starts at their earliest
// started_at and finishes at their latest finished_at. A skipped or never-played manual job is omitted, and a stage
// left with no job is omitted with it. reason = the pipeline's `source`, verbatim.
import type { CiJob, CiResult, CiRun, CiStage } from '@/schemas/vitals';
import { iso, shortBranch } from '../probeResult';

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v !== null && typeof v === 'object' ? (v as Rec) : {});
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : typeof v === 'number' ? String(v) : undefined);

/** A job or pipeline status; undefined means it never ran (skipped, manual), which drops it. */
export function glResult(status: unknown): CiResult | undefined {
  switch (status) {
    case 'success': return 'succeeded';
    case 'failed': return 'failed';
    case 'canceled': return 'canceled';
    case 'skipped':
    case 'manual': return undefined;
    default: return 'running';
  }
}

const FINISHED = new Set(['success', 'failed', 'canceled', 'skipped']);
export const pipelineFinished = (raw: unknown): boolean => FINISHED.has(String(rec(raw).status));

/** A job that failed but was allowed to: the run still succeeds, as partial (Azure's succeededWithIssues). */
const softFail = (j: Rec): boolean => j.status === 'failed' && j.allow_failure === true;

function stageResult(jobs: Rec[]): CiResult {
  const rs = jobs.map((j) => (softFail(j) ? 'partial' : glResult(j.status)));
  for (const r of ['running', 'failed', 'canceled', 'partial'] as const) if (rs.includes(r)) return r;
  return 'succeeded';
}

function mapJobs(jobs: unknown[]): CiStage[] {
  const live = jobs.map(rec).filter((j) => glResult(j.status) !== undefined);
  const byStage = new Map<string, Rec[]>();
  for (const j of live) {
    const s = str(j.stage) ?? '';
    byStage.set(s, [...(byStage.get(s) ?? []), j]);
  }
  const stages: CiStage[] = [];
  for (const [name, js] of byStage) {
    const result = stageResult(js);
    const starts = js.map((j) => iso(j.started_at)).filter((t): t is string => !!t).sort();
    const ends = js.map((j) => iso(j.finished_at)).filter((t): t is string => !!t).sort();
    const jobsOut: CiJob[] = js
      .map((j) => {
        const r: CiJob = { name: str(j.name) ?? '', result: softFail(j) ? 'partial' : (glResult(j.status) as CiResult) };
        const s = iso(j.started_at);
        const f = iso(j.finished_at);
        if (s) r.startedAt = s;
        if (f && r.result !== 'running') r.finishedAt = f;
        return r;
      })
      .sort((a, b) => (a.startedAt ?? '￿').localeCompare(b.startedAt ?? '￿'));
    const st: CiStage = { name, result, jobs: jobsOut };
    if (starts[0]) st.startedAt = starts[0];
    if (result !== 'running' && ends.length) st.finishedAt = ends.at(-1);
    stages.push(st);
  }
  return stages.sort((a, b) => (a.startedAt ?? '￿').localeCompare(b.startedAt ?? '￿'));
}

/** One pipeline with its jobs (pass [] for one still running); undefined when the row lacks an id. */
export function mapPipeline(raw: unknown, jobs: unknown[], pipeline: { id: string; name: string }, fetchedAt: string): CiRun | undefined {
  const r = rec(raw);
  const runId = str(r.id);
  const startedAt = iso(r.started_at) ?? iso(r.created_at);
  if (!runId || !startedAt) return undefined;
  const stages = mapJobs(jobs);
  // A whole pipeline that was skipped never ran to an end (canceled); one blocked on a manual job is still running.
  let result: CiResult = r.status === 'skipped' ? 'canceled' : glResult(r.status) ?? 'running';
  if (result === 'succeeded' && stages.some((s) => s.result === 'partial')) result = 'partial';
  const run: CiRun = {
    key: `gitlab-ci:${runId}`, provider: 'gitlab-ci', pipelineId: pipeline.id, pipelineName: pipeline.name, runId,
    branch: shortBranch(str(r.ref) ?? ''), reason: str(r.source) ?? '', sha: str(r.sha) ?? '', result, startedAt, stages, fetchedAt,
  };
  const finishedAt = result === 'running' ? undefined : iso(r.finished_at) ?? stages.map((s) => s.finishedAt).filter((t): t is string => !!t).sort().at(-1);
  if (finishedAt) run.finishedAt = finishedAt;
  return run;
}
