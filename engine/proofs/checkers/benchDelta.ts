// bench-delta (gardener, patch-bump: "a patch bump regresses nothing"). Compares the base and head test results and
// benchmark results a CI job produced, and passes only when no test fails at head that did not fail at base, every test
// that ran at base still runs at head, and every base benchmark's head value is within the tolerance of its base value,
// both measured on the same runner tag.
//
// Tolerance: the input's `tolerance`, a fraction of the base value (0.05 = 5 %), in [0, 1). When the input sets none the
// engine uses DEFAULT_TOLERANCE, 0.05, and the check says which one it used. It is not a policy key: the evidence job
// states it next to the numbers it measured. A benchmark is `{name, value, unit?, better?}`: `better` is 'lower' (the
// default: a time) or 'higher' (a throughput), so only a move in the worse direction beyond the tolerance regresses.
//
// Input: `base` and `head`, each `{junit?, trace?, job_ref?, bench}`; `bench` is `{runner_tag, benchmarks: [...]}` JSON,
// inline or `$file`. Anything missing, unreadable or not comparable is an ok:null check: inconclusive, never a pass.
import type { Check } from '../../../src/schemas/proof';
import { EngineError, isRecord, num, optStr, rec } from '../../core/types';
import { caseKey, casesOf, isRed, type JobEvidence } from '../../parse/cases';
import type { Draft } from '../common';
import { checksFor, jobEvidence, jsonEvidence, type At, type Read } from './evidence';

export const DEFAULT_TOLERANCE = 0.05;

interface Bench {
  name: string;
  value: number;
  unit: string;
  better: 'lower' | 'higher';
}

interface BenchRun {
  runner_tag: string;
  benchmarks: Map<string, Bench>;
}

function readBench(raw: unknown, what: string): Read<BenchRun> {
  const r = jsonEvidence(raw, what);
  if (!r.ok) return r;
  const b = r.value;
  if (!isRecord(b)) return { ok: false, reason: `${what} is not an object` };
  if (typeof b.runner_tag !== 'string' || b.runner_tag === '') return { ok: false, reason: `${what} names no runner_tag` };
  if (!Array.isArray(b.benchmarks) || b.benchmarks.length === 0) return { ok: false, reason: `${what} holds no benchmarks` };
  const benchmarks = new Map<string, Bench>();
  for (const [i, x] of b.benchmarks.entries()) {
    if (!isRecord(x) || typeof x.name !== 'string' || x.name === '') return { ok: false, reason: `${what}.benchmarks[${i}] names no benchmark` };
    if (typeof x.value !== 'number' || !Number.isFinite(x.value)) return { ok: false, reason: `${what}: ${x.name} has no numeric value` };
    if (x.better !== undefined && x.better !== 'lower' && x.better !== 'higher') return { ok: false, reason: `${what}: ${x.name}.better must be lower or higher` };
    if (benchmarks.has(x.name)) return { ok: false, reason: `${what}: ${x.name} is listed twice` };
    benchmarks.set(x.name, { name: x.name, value: x.value, unit: typeof x.unit === 'string' ? x.unit : '', better: x.better === 'higher' ? 'higher' : 'lower' });
  }
  return { ok: true, value: { runner_tag: b.runner_tag, benchmarks } };
}

function job(raw: unknown, what: string): JobEvidence & { bench: unknown } {
  const j = rec(raw, what);
  return { junit: optStr(j.junit, `${what}.junit`), trace: optStr(j.trace, `${what}.trace`), job_ref: optStr(j.job_ref, `${what}.job_ref`), bench: j.bench };
}

function toleranceOf(input: Record<string, unknown>): { tol: number; source: string } {
  if (input.tolerance === undefined) return { tol: DEFAULT_TOLERANCE, source: 'engine default' };
  const tol = num(input.tolerance, 'tolerance');
  if (tol < 0 || tol >= 1) throw new EngineError('tolerance must be a fraction in [0, 1)');
  return { tol, source: 'the input' };
}

function testChecks(at: At, base: JobEvidence, head: JobEvidence): Check[] {
  const b = casesOf(base);
  const h = casesOf(head);
  if (b.length === 0 || h.length === 0) {
    const why = `no test results at ${b.length === 0 ? 'base' : 'head'} (JUnit or trace)`;
    return [at('no-new-failures', null, why), at('same-tests', null, why)];
  }
  const redAtBase = new Set(b.filter(isRed).map(caseKey));
  const fresh = h.filter((c) => isRed(c) && !redAtBase.has(caseKey(c))).map(caseKey);
  const atHead = new Map(h.map((c) => [caseKey(c), c.status]));
  const lost = b.filter((c) => c.status !== 'skipped' && (atHead.get(caseKey(c)) ?? 'skipped') === 'skipped').map(caseKey);
  return [
    at('no-new-failures', fresh.length === 0, fresh.length ? `failing at head, not at base: ${fresh.join(', ')}` : `${h.length} case(s) at head, none newly failing (${redAtBase.size} already failing at base)`, head.job_ref),
    at('same-tests', lost.length === 0, lost.length ? `ran at base, missing or skipped at head: ${lost.join(', ')}` : `every one of the ${b.length} base case(s) runs at head`, head.job_ref),
  ];
}

const pctOf = (x: number): string => `${(x * 100).toFixed(1)} %`;

function benchChecks(at: At, base: Read<BenchRun>, head: Read<BenchRun>, tol: number, source: string): Check[] {
  if (!base.ok || !head.ok) {
    const why = [base, head].flatMap((r) => (r.ok ? [] : [r.reason])).join('; ');
    return [at('same-runner', null, why), at('bench-within-tolerance', null, why)];
  }
  const tags = `${base.value.runner_tag} then ${head.value.runner_tag}`;
  if (base.value.runner_tag !== head.value.runner_tag) {
    return [at('same-runner', null, `runner tags differ (${tags}): the benchmarks are not comparable`), at('bench-within-tolerance', null, 'needs base and head from the same runner tag')];
  }
  const worse: string[] = [];
  const unknown: string[] = [];
  for (const b of base.value.benchmarks.values()) {
    const h = head.value.benchmarks.get(b.name);
    if (!h) unknown.push(`${b.name} not measured at head`);
    else if (h.unit !== b.unit || h.better !== b.better) unknown.push(`${b.name} changed unit or direction`);
    else {
      const move = b.better === 'lower' ? h.value - b.value : b.value - h.value;
      const delta = b.value === 0 ? (move > 0 ? Number.POSITIVE_INFINITY : 0) : move / Math.abs(b.value); // from 0, any worse move is beyond a fraction
      if (delta > tol) worse.push(`${b.name} ${b.value} to ${h.value}${b.unit ? ` ${b.unit}` : ''} (${Number.isFinite(delta) ? pctOf(delta) : 'from 0'} worse)`);
    }
  }
  const limit = `tolerance ${pctOf(tol)} from ${source}`;
  const n = base.value.benchmarks.size;
  return [
    at('same-runner', true, `base and head both ran on ${base.value.runner_tag}`),
    worse.length
      ? at('bench-within-tolerance', false, `beyond the ${limit}: ${worse.join('; ')}`)
      : unknown.length
        ? at('bench-within-tolerance', null, `cannot compare: ${unknown.join('; ')}`)
        : at('bench-within-tolerance', true, `${n} benchmark(s) within the ${limit}`),
  ];
}

export function benchDelta(input: Record<string, unknown>): Draft {
  const at = checksFor(input);
  const base = job(input.base, 'base');
  const head = job(input.head, 'head');
  const { tol, source } = toleranceOf(input);
  const checks = [...testChecks(at, base, head), ...benchChecks(at, readBench(base.bench, 'base.bench'), readBench(head.bench, 'head.bench'), tol, source)];
  return { checks, evidence: jobEvidence(base.job_ref, head.job_ref) };
}
