import { describe, expect, it } from 'vitest';
import { checkOf, fixture, NOW, policy } from '../../__tests__/helpers';
import { MIN_REPRO_RUNS } from '../checkers/repro';
import { prove } from '../index';

const env = { policy: policy(), now: NOW };
const HEAD = '3f9a2c7e1b5d8f0a4c6e2b9d7f1a3c5e8b0d2f46';
const input = fixture('repro', 'input.pass.json');
const runs = (fixture('repro', 'runs.json').runs as Record<string, unknown>[]).filter((r) => !r.error);
const run = (patch: Record<string, unknown> = {}) => prove('repro', { ...input, ...patch }, env);
const hit = (id: string, more: Record<string, unknown> = {}) => ({ id, sha: HEAD, environment: 'staging', status: 500, failures: ['expected status 200, got 500'], ...more });

describe('repro', () => {
  it('passes when the claimed status and assertion reproduce twice on the head, leaving out a run whose probe broke', () => {
    const b = run();
    expect(b.verdict).toBe('pass');
    expect(checkOf(b, 'reproduces')).toMatchObject({ ok: true, claim_id: 'q1' });
    expect(checkOf(b, 'reproduces').detail).toMatch(/reproduced in 2 of 2 run\(s\), needs 2 \(1 run\(s\) whose probe broke/);
    expect(b.evidence).toHaveLength(3);
    expect(MIN_REPRO_RUNS).toBe(2);
  });

  it('fails a run on another SHA, and a failure that reproduces only once', () => {
    const b = prove('repro', fixture('repro', 'input.stray.json'), env);
    expect(checkOf(b, 'same-sha').ok).toBe(false);
    expect(checkOf(b, 'same-sha').detail).toMatch(/probe-2@a07c4e2b/);
    expect(checkOf(b, 'reproduces').ok).toBe(false);
    expect(b.verdict).toBe('fail');
  });

  it('fails a failure that does not reproduce: another status, or the claimed assertion not among the failures', () => {
    expect(checkOf(run({ runs: [hit('a', { status: 200 }), hit('b', { status: 200 })] }), 'reproduces').ok).toBe(false);
    expect(checkOf(run({ runs: [hit('a', { failures: ['timeout'] }), hit('b', { failures: [] })] }), 'reproduces').ok).toBe(false);
    expect(run({ runs: [hit('a'), hit('b', { environment: 'production' })] }).verdict).toBe('fail');
  });

  it('fails an input sha that is not the MR head', () => {
    const b = run({ sha: 'a07c4e2b9d1f3a5c7e9b0d2f4a6c8e1b3d5f7a90' });
    expect(checkOf(b, 'same-sha')).toMatchObject({ ok: false, detail: expect.stringMatching(/is not the MR head/) });
  });

  it('never passes on missing evidence: no runs, no head SHA, no environment, no claimed failure, too few runs', () => {
    const task = { ...(input.task as object), head_sha: undefined };
    const cases: Record<string, unknown>[] = [
      { runs: undefined },
      { runs: [] },
      { runs: '{ nope' },
      { runs: [{ id: 'x', environment: 'staging' }] },
      { task },
      { environment: undefined },
      { expect: undefined },
      { expect: {} },
      { runs: [hit('a'), hit('b', { error: 'probe could not reach staging' })] },
    ];
    for (const patch of cases) expect(run(patch).verdict, JSON.stringify(patch)).toBe('inconclusive');
    expect(checkOf(run({ runs: undefined }), 'reproduces').detail).toBe('runs is missing');
    expect(checkOf(run({ task }), 'same-sha').detail).toMatch(/no head SHA/);
  });

  it('takes the head from sha when the task carries none, and reads runs as a bare list', () => {
    const b = run({ task: { ...(input.task as object), head_sha: undefined }, sha: HEAD, runs });
    expect(b.verdict).toBe('pass');
  });

  it('counts one probe run once, as rerun-stats counts one job once: a run listed twice is not two reproductions', () => {
    const twice = checkOf(run({ runs: [hit('probe-1'), hit('probe-1')] }), 'reproduces');
    expect(twice).toMatchObject({ ok: null, detail: '1 usable run(s) on the head and target, needs 2 (1 repeated run record(s) counted once)' });
    expect(checkOf(run({ runs: [hit('probe-1'), hit('probe-1'), hit('probe-2')] }), 'reproduces').ok).toBe(true);
  });
});
