// Raw `az pipelines runs list` and build-timeline JSON -> CiRun. The timeline is a tree by parentId: a Stage holds
// Phases, a Phase holds Jobs. A skipped stage or job is OMITTED (CiResult has no "skipped"), and so is a job outside
// any stage (the "Finalize build" record). Absent times are omitted keys, never null.
import type { CiJob, CiResult, CiRun, CiStage } from '@/schemas/vitals';
import { iso, shortBranch } from '../probeResult';

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v !== null && typeof v === 'object' ? (v as Rec) : {});
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : typeof v === 'number' ? String(v) : undefined);

/** A whole run: status first (anything not completed is still running), then its result. */
export function runResult(status: unknown, result: unknown): CiResult {
  if (status !== 'completed') return 'running';
  switch (result) {
    case 'succeeded': return 'succeeded';
    case 'partiallySucceeded': return 'partial';
    case 'failed': return 'failed';
    case 'canceled': return 'canceled';
    default: return 'running';
  }
}

/** A timeline record; undefined means skipped, which drops the record. */
export function recordResult(state: unknown, result: unknown): CiResult | undefined {
  if (result === 'skipped') return undefined;
  if (state !== 'completed') return 'running';
  switch (result) {
    case 'succeeded': return 'succeeded';
    case 'succeededWithIssues': return 'partial';
    case 'failed': return 'failed';
    case 'canceled':
    case 'abandoned': return 'canceled';
    default: return 'running';
  }
}

/** Template parameters, over the queue-time variables (`parameters` is a JSON string of them), as strings. */
function runParameters(raw: Rec): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  if (typeof raw.parameters === 'string') {
    try {
      for (const [k, v] of Object.entries(rec(JSON.parse(raw.parameters)))) if (v !== null && v !== undefined) out[k] = String(v);
    } catch { /* not JSON: no queue-time variables */ }
  }
  for (const [k, v] of Object.entries(rec(raw.templateParameters))) if (v !== null && v !== undefined) out[k] = String(v);
  return Object.keys(out).length ? out : undefined;
}

/** One run without its stages; undefined when the row lacks an id or a definition. */
export function mapRun(raw: unknown, fetchedAt: string): CiRun | undefined {
  const r = rec(raw);
  const def = rec(r.definition);
  const runId = str(r.id);
  const pipelineId = str(def.id);
  const startedAt = iso(r.startTime) ?? iso(r.queueTime);
  if (!runId || !pipelineId || !startedAt) return undefined;
  const result = runResult(r.status, r.result);
  const run: CiRun = {
    key: `azure-pipelines:${runId}`, provider: 'azure-pipelines', pipelineId, pipelineName: str(def.name) ?? pipelineId, runId,
    branch: shortBranch(str(r.sourceBranch) ?? ''), reason: str(r.reason) ?? '', sha: str(r.sourceVersion) ?? '', result, startedAt,
    stages: [], fetchedAt,
  };
  const finishedAt = result === 'running' ? undefined : iso(r.finishTime);
  if (finishedAt) run.finishedAt = finishedAt;
  const parameters = runParameters(r);
  if (parameters) run.parameters = parameters;
  return run;
}

function timed<T extends CiJob>(base: T, r: Rec): T {
  const startedAt = iso(r.startTime);
  const finishedAt = iso(r.finishTime);
  if (startedAt) base.startedAt = startedAt;
  if (finishedAt && base.result !== 'running') base.finishedAt = finishedAt;
  return base;
}

/** Start order, unstarted last by the timeline's own `order`. */
const byStart = (a: { s?: string; o: number }, b: { s?: string; o: number }): number =>
  a.s && b.s ? a.s.localeCompare(b.s) || a.o - b.o : a.s ? -1 : b.s ? 1 : a.o - b.o;

/** The build timeline's records -> stages[].jobs[]. */
export function mapTimeline(timeline: unknown): CiStage[] {
  const records = Array.isArray(rec(timeline).records) ? (rec(timeline).records as unknown[]).map(rec) : [];
  const byId = new Map(records.map((r) => [str(r.id), r]));
  const stageOf = (r: Rec): string | undefined => {
    for (let p = byId.get(str(r.parentId)), hops = 0; p && hops < 8; p = byId.get(str(p.parentId)), hops++) if (p.type === 'Stage') return str(p.id);
    return undefined;
  };
  const sortKey = (r: Rec) => ({ s: iso(r.startTime), o: typeof r.order === 'number' ? r.order : Number.MAX_SAFE_INTEGER });
  const jobs = new Map<string, Rec[]>();
  for (const r of records) {
    if (r.type !== 'Job') continue;
    const sid = stageOf(r);
    if (sid) jobs.set(sid, [...(jobs.get(sid) ?? []), r]);
  }
  const stages: { k: ReturnType<typeof sortKey>; v: CiStage }[] = [];
  for (const s of records) {
    if (s.type !== 'Stage') continue;
    const result = recordResult(s.state, s.result);
    if (!result) continue;
    const js = (jobs.get(str(s.id) ?? '') ?? [])
      .map((j) => ({ k: sortKey(j), j, result: recordResult(j.state, j.result) }))
      .filter((x): x is typeof x & { result: CiResult } => x.result !== undefined)
      .sort((a, b) => byStart(a.k, b.k))
      .map((x) => timed<CiJob>({ name: str(x.j.name) ?? '', result: x.result }, x.j));
    stages.push({ k: sortKey(s), v: timed<CiStage>({ name: str(s.name) ?? str(s.identifier) ?? '', result, jobs: js }, s) });
  }
  return stages.sort((a, b) => byStart(a.k, b.k)).map((x) => x.v);
}
