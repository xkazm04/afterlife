// Reads the facts file collect-facts.mjs writes (belay.facts/0). A fact is its data or { error }; one that is missing was
// not collected. Either way it is unknown, never absent: each reader returns why, naming the fact, and the scan leaves the
// cell it decides null.
import { EngineError, isRecord, rec } from '../core/types';

export type Read<T> = { ok: true; v: T } | { ok: false; why: string };

export interface Facts {
  projectId: number;
  at: string;
  atMs: number;
  raw: Record<string, unknown>;
}

export interface Project { web: string; branch: string; mergeGate: Read<boolean> }
export interface CiJob { name: string; stage: string; allowFailure: Read<boolean> }
export interface RunJob { id: number; name: string; status: string; webUrl: string; finishedMs: number; artifacts: string[]; missing: string | null }
export interface Runs { pipeline: { id: number; webUrl: string | null } | null; jobs: RunJob[] }

const ok = <T>(v: T): Read<T> => ({ ok: true, v });
const no = (why: string): Read<never> => ({ ok: false, why });
const notCollected = (what: string): Read<never> => no(`${what} was not collected`);

export function parseFacts(raw: unknown): Facts {
  const f = rec(raw, 'facts file');
  if (f.schema !== 'belay.facts/0') throw new EngineError(`facts file schema is ${JSON.stringify(f.schema ?? null)}, not belay.facts/0`);
  if (!Number.isInteger(f.project_id)) throw new EngineError('facts file project_id must be an integer');
  const atMs = typeof f.at === 'string' ? Date.parse(f.at) : Number.NaN;
  if (Number.isNaN(atMs)) throw new EngineError('facts file at must be an ISO time');
  return { projectId: f.project_id as number, at: f.at as string, atMs, raw: rec(f.facts, 'facts file facts') };
}

/** The fact's data, or why it is unknown: { error } could not be read, missing was not collected. */
export function fact(f: Facts, name: string): Read<unknown> {
  if (!(name in f.raw)) return notCollected(name);
  const v = f.raw[name];
  if (isRecord(v) && typeof v.error === 'string') return no(`${name} could not be read (${v.error})`);
  return ok(v);
}

const list = (f: Facts, name: string): Read<unknown[]> => {
  const r = fact(f, name);
  if (!r.ok) return r;
  return Array.isArray(r.v) ? ok(r.v) : notCollected(`${name} as a list`);
};

export const strings = (f: Facts, name: string): Read<string[]> => {
  const r = list(f, name);
  return r.ok ? ok(r.v.filter((x): x is string => typeof x === 'string')) : r;
};

export const names = (f: Facts, name: string): Read<string[]> => {
  const r = list(f, name);
  return r.ok ? ok(r.v.flatMap((x) => (isRecord(x) && typeof x.name === 'string' ? [x.name] : []))) : r;
};

export const flag = (f: Facts, name: string): Read<boolean> => {
  const r = fact(f, name);
  return !r.ok ? r : typeof r.v === 'boolean' ? ok(r.v) : notCollected(`${name} as true or false`);
};

export function project(f: Facts): Read<Project> {
  const r = fact(f, 'project');
  if (!r.ok) return r;
  const p = isRecord(r.v) ? r.v : {};
  if (typeof p.web_url !== 'string' || !/^https?:\/\//.test(p.web_url)) return notCollected('project.web_url');
  if (typeof p.default_branch !== 'string' || p.default_branch === '') return notCollected('project.default_branch');
  const gate = p.merge_requires_pipeline;
  return ok({ web: p.web_url.replace(/\/+$/, ''), branch: p.default_branch, mergeGate: typeof gate === 'boolean' ? ok(gate) : notCollected('project.merge_requires_pipeline') });
}

export function ciJobs(f: Facts): Read<CiJob[]> {
  const r = fact(f, 'ci_config');
  if (!r.ok) return r;
  const jobs = isRecord(r.v) ? r.v.jobs : undefined;
  if (!Array.isArray(jobs)) return notCollected('ci_config.jobs');
  return ok(jobs.flatMap((j) => (isRecord(j) && typeof j.name === 'string'
    ? [{ name: j.name, stage: typeof j.stage === 'string' ? j.stage : '', allowFailure: typeof j.allow_failure === 'boolean' ? ok(j.allow_failure) : notCollected('ci_config.jobs[].allow_failure') }]
    : [])));
}

/** The latest green default-branch pipeline and its jobs. A job missing a field R2 decides on names it in `missing`, so only
 * a cell that needs that job is unknown; a stage with no job on the pipeline is still decided. */
export function runs(f: Facts): Read<Runs> {
  const r = fact(f, 'latest_pipeline_jobs');
  if (!r.ok) return r;
  if (!isRecord(r.v) || !Array.isArray(r.v.jobs)) return notCollected('latest_pipeline_jobs.jobs');
  const p = r.v.pipeline;
  const pipeline = isRecord(p) && Number.isInteger(p.id) ? { id: p.id as number, webUrl: typeof p.web_url === 'string' ? p.web_url : null } : null;
  const jobs = r.v.jobs.flatMap((j): RunJob[] => {
    if (!isRecord(j) || typeof j.name !== 'string') return [];
    const gone = (['id', 'status', 'web_url', 'finished_at', 'artifacts'] as const).find((k) => !(k in j));
    const finishedMs = typeof j.finished_at === 'string' ? Date.parse(j.finished_at) : Number.NaN;
    return [{
      id: Number(j.id), name: j.name, status: String(j.status), webUrl: typeof j.web_url === 'string' ? j.web_url : '', finishedMs,
      artifacts: Array.isArray(j.artifacts) ? j.artifacts.filter((a): a is string => typeof a === 'string') : [],
      missing: gone ? `latest_pipeline_jobs.jobs[].${gone}` : null,
    }];
  });
  return ok({ pipeline, jobs });
}
