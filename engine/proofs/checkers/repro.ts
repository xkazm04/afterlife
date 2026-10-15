// repro (QA, qa.file-bug: "the bug reproduces"). Reads the structured results of a probe a CI job ran against the
// target environment on the MR's head SHA, and recomputes whether the failure the agent claims shows up. It passes only
// when the claimed failure (an HTTP status, an assertion text, or both) reproduces in at least MIN_REPRO_RUNS runs, every
// run names the head SHA and the target environment. A run whose probe itself broke (`error`) is left out, not counted.
//
// Input: `environment`, `expect: {status?, assertion?}`, `runs` (a JSON list, or `{runs: [...]}`, inline or `$file`), and
// the head SHA from `task.head_sha` (else `sha`). A run is `{id, sha, environment, status?, failures?: string[], error?,
// job_ref?}`. Anything missing or unreadable is an ok:null check: inconclusive, never a pass.
import type { Check } from '../../../src/schemas/proof';
import { isRecord } from '../../core/types';
import type { Draft, ProofBase } from '../common';
import { checksFor, jsonEvidence, type Read } from './evidence';

/** Reproduced twice on one SHA: once could be a blip, and the engine sets no higher bar than the item asks. */
export const MIN_REPRO_RUNS = 2;

interface ProbeRun {
  id: string;
  sha: string;
  environment: string;
  status?: number;
  failures: string[];
  error?: string;
  job_ref?: string;
}

interface Expect {
  status?: number;
  assertion?: string;
}

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();
const text = (v: unknown): v is string => typeof v === 'string' && v !== '';

function parseRun(raw: unknown, i: number): ProbeRun | string {
  if (!isRecord(raw)) return `runs[${i}] is not an object`;
  if (!text(raw.sha)) return `runs[${i}] names no sha`;
  if (!text(raw.environment)) return `runs[${i}] names no environment`;
  if (raw.status !== undefined && !Number.isInteger(raw.status)) return `runs[${i}].status is not an integer`;
  if (raw.failures !== undefined && (!Array.isArray(raw.failures) || raw.failures.some((f) => typeof f !== 'string'))) return `runs[${i}].failures is not a list of strings`;
  return {
    id: text(raw.id) ? raw.id : String(i),
    sha: raw.sha,
    environment: raw.environment,
    status: raw.status as number | undefined,
    failures: (raw.failures as string[] | undefined) ?? [],
    error: text(raw.error) ? raw.error : undefined,
    job_ref: text(raw.job_ref) ? raw.job_ref : undefined,
  };
}

function readRuns(raw: unknown): Read<ProbeRun[]> {
  const r = jsonEvidence(raw, 'runs');
  if (!r.ok) return r;
  const list = isRecord(r.value) ? r.value.runs : r.value;
  if (!Array.isArray(list)) return { ok: false, reason: 'runs is not a list of probe runs' };
  if (list.length === 0) return { ok: false, reason: 'the probe recorded no runs' };
  const runs: ProbeRun[] = [];
  for (const [i, x] of list.entries()) {
    const run = parseRun(x, i);
    if (typeof run === 'string') return { ok: false, reason: run };
    runs.push(run);
  }
  return { ok: true, value: runs };
}

function readExpect(raw: unknown): Expect | undefined {
  if (!isRecord(raw)) return undefined;
  const e: Expect = {};
  if (Number.isInteger(raw.status)) e.status = raw.status as number;
  if (text(raw.assertion)) e.assertion = raw.assertion;
  return e.status === undefined && e.assertion === undefined ? undefined : e;
}

const describeExpect = (e: Expect): string => [e.status !== undefined ? `status ${e.status}` : '', e.assertion ? `assertion "${e.assertion}"` : ''].filter(Boolean).join(' and ');
const matches = (r: ProbeRun, e: Expect): boolean =>
  (e.status === undefined || r.status === e.status) && (e.assertion === undefined || r.failures.some((f) => squash(f).includes(squash(e.assertion ?? ''))));
const observed = (rs: readonly ProbeRun[]): string => rs.map((r) => `${r.id}=${r.status ?? 'no status'}${r.failures.length ? ` (${r.failures.length} failed assertion(s))` : ''}`).join(', ');

export function repro(input: Record<string, unknown>, base: ProofBase): Draft {
  const at = checksFor(input);
  const runs = readRuns(input.runs);
  const given = text(input.sha) ? input.sha : undefined;
  const head = base.task.head_sha ?? given;
  const env = text(input.environment) ? input.environment : undefined;
  const expect = readExpect(input.expect);
  const checks: Check[] = [];

  if (!head) checks.push(at('same-sha', null, 'no head SHA in the input (task.head_sha or sha)'));
  else if (given && given !== head) checks.push(at('same-sha', false, `sha ${given} is not the MR head ${head}`));
  else if (!runs.ok) checks.push(at('same-sha', null, runs.reason));
  else {
    const stray = runs.value.filter((r) => r.sha !== head);
    checks.push(at('same-sha', stray.length === 0, stray.length ? `${stray.length} run(s) not on ${head}: ${stray.map((r) => `${r.id}@${r.sha}`).join(', ')}` : `${runs.value.length} run(s), all on ${head}`));
  }

  if (!env) checks.push(at('target-environment', null, 'no target environment in the input'));
  else if (!runs.ok) checks.push(at('target-environment', null, runs.reason));
  else {
    const off = runs.value.filter((r) => r.environment !== env);
    checks.push(at('target-environment', off.length === 0, off.length ? `run(s) not against ${env}: ${off.map((r) => `${r.id}@${r.environment}`).join(', ')}` : `every run probed ${env}`));
  }

  if (!expect) checks.push(at('reproduces', null, 'the input names no claimed failure (expect.status or expect.assertion)'));
  else if (!runs.ok) checks.push(at('reproduces', null, runs.reason));
  else {
    const usable = runs.value.filter((r) => r.sha === head && r.environment === env && !r.error);
    const broke = runs.value.filter((r) => r.error).length;
    const hit = usable.filter((r) => matches(r, expect));
    const what = describeExpect(expect);
    const left = broke ? ` (${broke} run(s) whose probe broke left out)` : '';
    if (hit.length >= MIN_REPRO_RUNS) checks.push(at('reproduces', true, `${what} reproduced in ${hit.length} of ${usable.length} run(s), needs ${MIN_REPRO_RUNS}${left}`));
    else if (usable.length < MIN_REPRO_RUNS) checks.push(at('reproduces', null, `${usable.length} usable run(s) on the head and target, needs ${MIN_REPRO_RUNS}${left}`));
    else checks.push(at('reproduces', false, `${what} reproduced in ${hit.length} of ${usable.length} run(s), needs ${MIN_REPRO_RUNS}; observed ${observed(usable)}${left}`));
  }

  const evidence = runs.ok ? runs.value.map((r) => (r.job_ref ? { kind: 'job' as const, ref: r.job_ref } : { kind: 'note' as const, ref: `probe run ${r.id}` })) : [];
  return { checks, evidence };
}
