import { describe, expect, it } from 'vitest';
import { EngineError } from '../../core/types';
import { checkOf, fixture, NOW, policy } from '../../__tests__/helpers';
import { DEFAULT_MAX_TOLERANCE, DEFAULT_TOLERANCE } from '../checkers/benchDelta';
import { prove } from '../index';

const env = { policy: policy(), now: NOW };
const input = fixture('bench', 'input.pass.json');
const job = (side: 'base' | 'head') => input[side] as Record<string, unknown>;
const bench = (runner_tag: string, ...benchmarks: Record<string, unknown>[]) => ({ runner_tag, benchmarks });
const R = 'saas-linux-medium-amd64';
const run = (patch: Record<string, unknown> = {}) => prove('bench-delta', { ...input, ...patch }, env);
const withBench = (base: unknown, head: unknown, more: Record<string, unknown> = {}) => run({ base: { ...job('base'), bench: base }, head: { ...job('head'), bench: head }, ...more });

describe('bench-delta', () => {
  it('passes with no new failure (a failure already at base is not new) and every benchmark within the default tolerance', () => {
    const b = run();
    expect(b.verdict).toBe('pass');
    expect(checkOf(b, 'no-new-failures').detail).toMatch(/1 already failing at base/);
    expect(checkOf(b, 'bench-within-tolerance').detail).toMatch(/2 benchmark\(s\) within the tolerance 5\.0 % from engine default/);
    expect(DEFAULT_TOLERANCE).toBe(0.05);
    expect(b.evidence).toHaveLength(2);
  });

  it('fails a new test failure, a test no longer run, and a benchmark beyond the tolerance', () => {
    const b = prove('bench-delta', fixture('bench', 'input.regressed.json'), env);
    expect(checkOf(b, 'no-new-failures').detail).toMatch(/StatementJsonTest#readsLegacyDates/);
    expect(checkOf(b, 'same-tests').detail).toMatch(/StatementExportTest#exportsMonth/);
    expect(checkOf(b, 'bench-within-tolerance').detail).toMatch(/statement-export-p95 182 to 204 ms \(12\.1 % worse\)/);
    expect(b.verdict).toBe('fail');
  });

  it('reads the tolerance from the input, judges only the worse direction, and refuses a tolerance out of range', () => {
    const slow = withBench(bench(R, { name: 't', value: 100 }), bench(R, { name: 't', value: 104 }));
    expect(slow.verdict).toBe('pass');
    expect(withBench(bench(R, { name: 't', value: 100 }), bench(R, { name: 't', value: 104 }), { tolerance: 0.02 }).verdict).toBe('fail');
    expect(checkOf(withBench(bench(R, { name: 't', value: 100 }), bench(R, { name: 't', value: 104 }), { tolerance: 0.02 }), 'bench-within-tolerance').detail).toMatch(/from the input/);
    expect(withBench(bench(R, { name: 't', value: 100 }), bench(R, { name: 't', value: 50 })).verdict).toBe('pass'); // faster
    expect(withBench(bench(R, { name: 'ops', value: 100, better: 'higher' }), bench(R, { name: 'ops', value: 90, better: 'higher' })).verdict).toBe('fail');
    expect(withBench(bench(R, { name: 't', value: 0 }), bench(R, { name: 't', value: 1 })).verdict).toBe('fail');
    for (const tolerance of [-0.1, 1, 'x']) expect(() => run({ tolerance })).toThrow(EngineError);
  });

  it('fails a tolerance wider than the policy ceiling, naming both numbers, so the evidence job cannot widen its own limit', () => {
    const slow = [bench(R, { name: 't', value: 100 }), bench(R, { name: 't', value: 104 })] as const;
    const tight = { policy: { ...policy(), bench_delta: { max_tolerance: 0.05 } }, now: NOW };
    const wide = prove('bench-delta', { ...input, base: { ...job('base'), bench: slow[0] }, head: { ...job('head'), bench: slow[1] }, tolerance: 0.9 }, tight);
    expect([wide.verdict, checkOf(wide, 'bench-within-tolerance').detail]).toEqual(['fail', 'tolerance 90.0 % is wider than the 5.0 % ceiling from trust-policy.yml bench_delta.max_tolerance']);
    expect(prove('bench-delta', { ...input, tolerance: 0.05 }, tight).verdict).toBe('pass'); // at the ceiling is inside it
    const unset = { policy: { ...policy(), bench_delta: undefined }, now: NOW };
    expect(checkOf(prove('bench-delta', { ...input, tolerance: 0.5 }, unset), 'bench-within-tolerance').detail).toMatch(/10\.0 % ceiling from the engine default/);
    expect(DEFAULT_MAX_TOLERANCE).toBe(0.1);
    expect(policy().bench_delta?.max_tolerance).toBe(0.1);
  });

  it('is inconclusive on different runner tags, a benchmark not measured at head, or a changed unit', () => {
    const other = withBench(bench(R, { name: 't', value: 100 }), bench('saas-linux-large-amd64', { name: 't', value: 100 }));
    expect([other.verdict, checkOf(other, 'same-runner').ok]).toEqual(['inconclusive', null]);
    expect(withBench(bench(R, { name: 't', value: 100 }, { name: 'u', value: 1 }), bench(R, { name: 't', value: 100 })).verdict).toBe('inconclusive');
    expect(withBench(bench(R, { name: 't', value: 100, unit: 'ms' }), bench(R, { name: 't', value: 0.1, unit: 's' })).verdict).toBe('inconclusive');
  });

  it('never passes on missing evidence: no bench, unreadable bench, no runner tag, no benchmarks, no test results', () => {
    const good = bench(R, { name: 't', value: 1 });
    const cases = [
      withBench(undefined, good),
      withBench(good, '{ nope'),
      withBench({ benchmarks: good.benchmarks }, good),
      withBench(bench(R), bench(R)),
      withBench(bench(R, { name: 't', value: 'fast' }), good),
      withBench(bench(R, { name: 't', value: 1 }, { name: 't', value: 2 }), good),
      run({ base: { ...job('base'), junit: undefined } }),
      run({ head: { ...job('head'), junit: '<testsuites/>' } }),
    ];
    for (const b of cases) expect(b.verdict).toBe('inconclusive');
    expect(checkOf(cases[0]!, 'bench-within-tolerance').detail).toBe('base.bench is missing');
    expect(() => run({ base: undefined })).toThrow(/base must be an object/);
  });
});
