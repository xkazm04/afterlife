// Azure Pipelines runs for a project: per configured pipeline the newest 50 runs, those newer than `sinceRunId` and
// within `maxDays`, each finished one with its build timeline (at most 4 timelines in flight). A failed call throws a
// ProviderError carrying the fail probe, so the collector records it and appends nothing half-read.
import type { CiRun, ProbeSpec, ProjectConfig } from '@/schemas/vitals';
import type { Exec } from '../types';
import { ProviderError, mapLimit, probeResult } from '../probeResult';
import { azArgs, azArgv, orgUrl, type AzArgs } from './args';
import { mapRun, mapTimeline } from './map';
import { azJson } from './probes';

const TOP = 50;
const TIMELINES_IN_FLIGHT = 4;
const DAY_MS = 86_400_000;

export interface ListOpts { sinceRunId?: string; maxDays?: number }

function fail(spec: ProbeSpec, t0: number, summary: string): never {
  throw new ProviderError(probeResult(spec, t0, 'fail', summary));
}

export async function listAzureRuns(exec: Exec, cfg: ProjectConfig, opts: ListOpts = {}, now: () => number = Date.now): Promise<CiRun[]> {
  const t0 = Date.now();
  const base = { org: cfg.host.org ? orgUrl(cfg.host.org) : '', project: cfg.host.project ?? '' };
  const since = opts.sinceRunId !== undefined && /^\d+$/.test(opts.sinceRunId) ? Number(opts.sinceRunId) : undefined;
  const cutoff = now() - (opts.maxDays ?? 90) * DAY_MS;
  const fetchedAt = new Date(now()).toISOString();

  const lists = await mapLimit(cfg.ci.pipelines, TIMELINES_IN_FLIGHT, async (p) => {
    const spec: ProbeSpec = { kind: 'az-devops-runs', args: { ...base, pipelineId: p.id } };
    const a = azArgs(spec.args, { pipelineId: 'required' });
    if (typeof a === 'string') fail(spec, t0, `bad args: ${a}`);
    const out = await azJson(exec, azArgv.runs(a, TOP));
    if ('fail' in out) fail(spec, t0, out.fail);
    const raw = Array.isArray(out.value) ? out.value : [];
    return raw
      .map((r) => mapRun(r, fetchedAt))
      .filter((r): r is CiRun => r !== undefined && (since === undefined || Number(r.runId) > since) && Date.parse(r.startedAt) >= cutoff)
      .map((r) => ({ run: { ...r, pipelineName: p.name || r.pipelineName }, args: a }));
  });

  const all = lists.flat();
  const runs = await mapLimit(all, TIMELINES_IN_FLIGHT, async ({ run, args }: { run: CiRun; args: AzArgs }) => {
    if (run.result === 'running') return run;
    const spec: ProbeSpec = { kind: 'az-devops-timeline', args: { org: args.org, project: args.project, runId: run.runId } };
    const out = await azJson(exec, azArgv.timeline({ ...args, runId: run.runId }));
    if ('fail' in out) fail(spec, t0, `run ${run.runId}: ${out.fail}`);
    return { ...run, stages: mapTimeline(out.value) };
  });
  return runs.sort((a, b) => Number(b.runId) - Number(a.runId));
}
