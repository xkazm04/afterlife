// The four Azure DevOps probes the wizard runs, read-only, through the person's own `az` login. A lapsed login, a
// missing az or a bad arg is a `fail` whose summary says what to do; a probe never throws.
import type { ProbeResult, ProbeSpec } from '@/schemas/vitals';
import type { Exec } from '../types';
import { failSummary, mapLimit, parseJson, probeResult } from '../probeResult';
import { azArgs, azArgv } from './args';
import { mapRun, mapTimeline } from './map';

type Rec = Record<string, unknown>;
const rows = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter((x): x is Rec => x !== null && typeof x === 'object') : []);

export type AzOut = { value: unknown } | { fail: string };

/** Runs az and parses its JSON. Empty stdout on exit 0 is `null` (a run that failed to compile has no timeline). */
export async function azJson(exec: Exec, argv: string[]): Promise<AzOut> {
  const r = await exec('az', argv);
  if (r.code !== 0) return { fail: failSummary('az', r) };
  if (!r.stdout.trim()) return { value: null };
  const value = parseJson(r.stdout);
  return value === undefined ? { fail: 'az printed something that is not JSON' } : { value };
}

export async function azProbe(exec: Exec, spec: ProbeSpec): Promise<ProbeResult> {
  const t0 = Date.now();
  const done = (status: ProbeResult['status'], summary: string, data?: Record<string, string>) => probeResult(spec, t0, status, summary, data);

  if (spec.kind === 'az-login') {
    const out = await azJson(exec, azArgv.account());
    if ('fail' in out) return done('fail', out.fail);
    const v = out.value;
    const a = (v ?? {}) as Rec;
    const name = typeof a.name === 'string' ? a.name : '';
    return name ? done('ok', `logged in to ${name}`, { subscription: name, ...(typeof a.id === 'string' ? { subscriptionId: a.id } : {}) }) : done('fail', 'az account show returned no subscription - run `az login`');
  }

  const need = spec.kind === 'az-devops-timeline' ? { runId: 'required' as const } : spec.kind === 'az-devops-runs' ? { pipelineId: 'optional' as const } : {};
  const a = azArgs(spec.args, need);
  if (typeof a === 'string') return done('fail', `bad args: ${a}`);

  if (spec.kind === 'az-devops-pipelines') {
    const out = await azJson(exec, azArgv.pipelines(a));
    if ('fail' in out) return done('fail', out.fail);
    const v = out.value;
    const ps = rows(v).filter((p) => typeof p.id === 'number' || typeof p.id === 'string');
    const data: Record<string, string> = { pipelineIds: ps.map((p) => String(p.id)).join(',') };
    for (const p of ps) if (typeof p.name === 'string') data[`pipeline:${p.id}`] = p.name;
    // Which YAML each definition runs, so the wizard can tell a CI file that is registered from one that never ran.
    // A show that fails leaves its key out: the file is then unknown, never guessed.
    const files = await mapLimit(ps, 4, async (p) => {
      const one = await azJson(exec, azArgv.pipeline(a, String(p.id)));
      const y = 'value' in one ? ((one.value as Rec | null)?.process as Rec | undefined)?.yamlFilename : undefined;
      return typeof y === 'string' && y ? ([String(p.id), y] as const) : undefined;
    });
    for (const f of files) if (f) data[`pipelineFile:${f[0]}`] = f[1];
    return done(ps.length ? 'ok' : 'fail', ps.length ? `${ps.length} pipeline${ps.length === 1 ? '' : 's'}` : 'no pipelines in this project', data);
  }

  if (spec.kind === 'az-devops-runs') {
    const out = await azJson(exec, azArgv.runs(a));
    if ('fail' in out) return done('fail', out.fail);
    const v = out.value;
    const runs = rows(v).map((r) => mapRun(r, new Date().toISOString())).filter((r) => r !== undefined);
    const newest = runs.map((r) => r.startedAt).sort().at(-1);
    if (!newest) return done('fail', 'no runs yet');
    return done('ok', `${runs.length} run${runs.length === 1 ? '' : 's'}, newest ${newest.slice(0, 10)}`, { newestRunId: String(Math.max(...runs.map((r) => Number(r.runId)))) });
  }

  if (spec.kind === 'az-devops-timeline') {
    const out = await azJson(exec, azArgv.timeline({ ...a, runId: a.runId ?? '' }));
    if ('fail' in out) return done('fail', out.fail);
    const v = out.value;
    const stages = mapTimeline(v);
    const jobs = stages.reduce((n, s) => n + s.jobs.length, 0);
    return done(stages.length ? 'ok' : 'fail', stages.length ? `${stages.length} stages, ${jobs} jobs` : 'this run has no timeline', { stages: stages.map((s) => s.name).join(',') });
  }

  return done('skipped', `${spec.kind} is not an Azure Pipelines probe`);
}
