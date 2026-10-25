// The GitLab CI CiProvider: probes and pipelines through the person's own `glab` login, read-only (`glab api` GETs).
// GitLab has one pipeline per project, so the config's first pipeline entry names it (id and name); the project is
// cfg.host.path.
import type { CiRun, ProbeResult, ProbeSpec, ProjectConfig } from '@/schemas/vitals';
import type { CiProvider, Exec } from '../types';
import { defaultExec } from '../exec';
import { ProviderError, failSummary, mapLimit, probeResult } from '../probeResult';
import { glArgs, glArgv, glabJson } from './glab';
import { mapPipeline, pipelineFinished } from './map';

const DAY_MS = 86_400_000;
const rows = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x) => x !== null && typeof x === 'object') : []);

export async function glProbe(exec: Exec, spec: ProbeSpec): Promise<ProbeResult> {
  const t0 = Date.now();
  const done = (status: ProbeResult['status'], summary: string, data?: Record<string, string>) => probeResult(spec, t0, status, summary, data);
  if (spec.kind === 'glab-auth') {
    // glab prints its status on stderr; only the host is kept (the line also names the account).
    const r = await exec('glab', glArgv.auth());
    const host = /Logged in to (\S+)/i.exec(`${r.stderr}\n${r.stdout}`)?.[1];
    if (r.code === 0 && host) return done('ok', `logged in to ${host}`, { host });
    // Any failing `auth status` means no usable login, so the re-login command is always named. Its first line is
    // only the host header, so the line that says what failed is the one shown.
    if (r.code === 127) return done('fail', failSummary('glab', r));
    const line = r.stderr.split(/\r?\n/).map((l) => l.trim()).find((l) => /401|unauthori|not logged|failed|error/i.test(l));
    return done('fail', `${line ?? 'glab is not logged in'} - run \`glab auth login\``);
  }
  const a = glArgs(spec.args, spec.kind === 'glab-jobs');
  if (typeof a === 'string') return done('fail', `bad args: ${a}`);
  if (spec.kind === 'glab-pipelines') {
    const out = await glabJson(exec, glArgv.pipelines(a.path));
    if ('fail' in out) return done('fail', out.fail);
    const ps = rows(out.value);
    const newest = ps.map((p) => String(p.created_at ?? '')).sort().at(-1);
    return ps.length ? done('ok', `${ps.length} pipelines, newest ${newest?.slice(0, 10)}`, { newestRunId: String(ps[0]?.id) }) : done('fail', 'no pipelines yet');
  }
  if (spec.kind === 'glab-jobs') {
    const out = await glabJson(exec, glArgv.jobs(a.path, a.pipelineId ?? ''));
    if ('fail' in out) return done('fail', out.fail);
    const js = rows(out.value);
    const stages = new Set(js.map((j) => String(j.stage ?? '')));
    return js.length ? done('ok', `${js.length} jobs in ${stages.size} stages`, { stages: [...stages].join(',') }) : done('fail', 'this pipeline has no jobs');
  }
  return done('skipped', `${spec.kind} is not a GitLab CI probe`);
}

export async function listGitlabRuns(exec: Exec, cfg: ProjectConfig, opts: { sinceRunId?: string; maxDays?: number } = {}, now: () => number = Date.now): Promise<CiRun[]> {
  const t0 = Date.now();
  const spec: ProbeSpec = { kind: 'glab-pipelines', args: { path: cfg.host.path ?? '' } };
  const fail = (s: ProbeSpec, summary: string): never => { throw new ProviderError(probeResult(s, t0, 'fail', summary)); };
  const a = glArgs(spec.args, false);
  if (typeof a === 'string') return fail(spec, `bad args: ${a}`);
  const pipeline = { id: cfg.ci.pipelines[0]?.id ?? a.path, name: cfg.ci.pipelines[0]?.name ?? a.path };
  const out = await glabJson(exec, glArgv.pipelines(a.path));
  if ('fail' in out) return fail(spec, out.fail);
  const since = opts.sinceRunId !== undefined && /^\d+$/.test(opts.sinceRunId) ? Number(opts.sinceRunId) : undefined;
  const cutoff = now() - (opts.maxDays ?? 90) * DAY_MS;
  const fetchedAt = new Date(now()).toISOString();
  const fresh = rows(out.value).filter((p) => (since === undefined || Number(p.id) > since) && Date.parse(String(p.created_at)) >= cutoff);
  const runs = await mapLimit(fresh, 4, async (p) => {
    if (!pipelineFinished(p)) return mapPipeline(p, [], pipeline, fetchedAt);
    const js = { kind: 'glab-jobs' as const, args: { path: a.path, pipelineId: String(p.id) } };
    const jobs = await glabJson(exec, glArgv.jobs(a.path, String(p.id)));
    if ('fail' in jobs) return fail(js, `pipeline ${p.id}: ${jobs.fail}`);
    return mapPipeline(p, Array.isArray(jobs.value) ? jobs.value : [], pipeline, fetchedAt);
  });
  return runs.filter((r): r is CiRun => r !== undefined).sort((x, y) => Number(y.runId) - Number(x.runId));
}

export function gitlabCi(exec: Exec = defaultExec, now: () => number = Date.now): CiProvider {
  return { kind: 'gitlab-ci', probe: (spec) => glProbe(exec, spec), listRuns: (cfg, opts) => listGitlabRuns(exec, cfg, opts, now) };
}
