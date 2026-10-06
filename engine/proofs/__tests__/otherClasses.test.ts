import { describe, expect, it } from 'vitest';
import { EngineError } from '../../core/types';
import { checkOf, fixture, NOW, policy } from '../../__tests__/helpers';
import { parsePolicy } from '../../policy/load';
import { prove, PROOF_CLASSES } from '../index';
import { classify, DEFAULT_THRESHOLDS } from '../rerunStats';

const env = { policy: policy(), now: NOW };

describe('rerun-stats', () => {
  const run = (name: string, patch: Record<string, unknown> = {}) => prove('rerun-stats', { ...fixture('rerun', name), ...patch }, env);

  it('passes a flake that the engine recomputes the same way, ignoring cancelled and infrastructure runs', () => {
    const b = run('flake.json');
    expect(b.verdict).toBe('pass');
    expect(checkOf(b, 'enough-runs').detail).toMatch(/6 usable run\(s\).*2 cancelled or infrastructure/);
    expect(checkOf(b, 'counts-match').ok).toBe(true);
    expect(checkOf(b, 'classification').detail).toMatch(/^flake: 2 failed of 6/);
    expect(b.evidence).toHaveLength(8);
  });

  it('fails an agent that calls a mostly-failing job a flake', () => {
    const b = run('real.json');
    expect(checkOf(b, 'classification').ok).toBe(false);
    expect(checkOf(b, 'classification').detail).toMatch(/real-failure: 5 failed of 6/);
    expect(b.verdict).toBe('fail');
    expect(run('real.json', { claim: { classification: 'real-failure' } }).verdict).toBe('pass');
  });

  it('fails counts the agent got wrong, recomputed from the job records', () => {
    const b = run('flake.json', { claim: { classification: 'flake', passes: 5, fails: 1 } });
    expect(checkOf(b, 'counts-match').ok).toBe(false);
    expect(checkOf(b, 'counts-match').detail).toMatch(/claimed 5 pass \/ 1 fail, recomputed 4 \/ 2/);
    expect(b.verdict).toBe('fail');
  });

  it('fails runs that are not all on one SHA, and is inconclusive with too few runs', () => {
    const b = run('thin.json');
    expect(checkOf(b, 'same-sha').ok).toBe(false);
    expect(checkOf(b, 'enough-runs').ok).toBeNull();
    expect(b.verdict).toBe('fail');
    const few = run('flake.json', { runs: (fixture('rerun', 'flake.json').runs as unknown[]).slice(0, 4), claim: { classification: 'flake' } });
    expect(few.verdict).toBe('inconclusive');
  });

  it('classifies at the thresholds: stable at no failures, real failure from the policy rate', () => {
    const t = DEFAULT_THRESHOLDS;
    expect(classify(6, 0, t)).toBe('stable-pass');
    expect(classify(1, 1, t)).toBe('flake');
    expect(classify(1, 3, t)).toBe('flake'); // 0.75 < 0.8
    expect(classify(1, 4, t)).toBe('real-failure'); // 0.80
    expect(classify(0, 5, t)).toBe('real-failure');
  });

  it('reads thresholds from a rerun_stats block in the policy, and says where they came from', () => {
    const custom = parsePolicy({ ...(policy() as object), rerun_stats: { min_runs: 3, real_failure_rate: 0.5 } });
    const b = prove('rerun-stats', fixture('rerun', 'flake.json'), { policy: custom, now: NOW });
    expect(checkOf(b, 'enough-runs').detail).toContain('trust-policy.yml rerun_stats');
    expect(checkOf(b, 'classification').ok).toBe(true); // 2/6 = 0.33 is below 0.5, still a flake
    const strict = parsePolicy({ ...(policy() as object), rerun_stats: { real_failure_rate: 0.3 } });
    expect(checkOf(prove('rerun-stats', fixture('rerun', 'flake.json'), { policy: strict, now: NOW }), 'classification').ok).toBe(false); // 0.33 is now a real failure
  });
});

describe('linked-evidence', () => {
  const run = (name: string, patch: Record<string, unknown> = {}) => prove('linked-evidence', { ...fixture('linked', name), ...patch }, env);

  it('passes when every link resolves and the clock is right; legal wording is left to a person', () => {
    const b = run('input.json');
    expect(b.verdict).toBe('pass');
    const wording = checkOf(b, 'wording');
    expect(wording).toMatchObject({ ok: null, decidedBy: 'human', claim_id: 's3' });
    expect(checkOf(b, 'clock-arithmetic').ok).toBe(true);
    expect(b.evidence).toHaveLength(4);
  });

  it('fails a missing object, a statement without a link, a foreign host and wrong clock arithmetic', () => {
    const b = run('input.broken.json');
    expect(checkOf(b, 'links-resolve', 's1').detail).toMatch(/does not exist/);
    expect(checkOf(b, 'links-resolve', 's2').ok).toBeNull();
    expect(checkOf(b, 'links-resolve', 's3').detail).toMatch(/links to nothing/);
    expect(checkOf(b, 'links-resolve', 's4').detail).toMatch(/not on an allowed host/);
    expect(checkOf(b, 'clock-arithmetic').ok).toBe(false);
    expect(b.verdict).toBe('fail');
  });

  it('never fetches: a link nobody resolved is inconclusive, and an error result is not a pass', () => {
    const only = { claims: [{ id: 's1', text: 't', links: ['https://gitlab.com/g/p/-/issues/1'] }], clock: undefined };
    expect(run('input.json', { ...only, resolutions: {} }).verdict).toBe('inconclusive');
    expect(run('input.json', { ...only, resolutions: { 'https://gitlab.com/g/p/-/issues/1': { status: 'error' } } }).verdict).toBe('inconclusive');
    expect(run('input.json', { ...only, resolutions: { 'https://gitlab.com/g/p/-/issues/1': { status: 'forbidden' } } }).verdict).toBe('fail');
  });

  it('rejects non-http links, and a final deadline that disagrees with the fix date', () => {
    expect(run('input.json', { claims: [{ id: 's1', text: 't', links: ['file:///etc/passwd'] }] }).verdict).toBe('fail');
    const clock = { kind: 'vulnerability', aware_at: '2026-10-09T09:00:00Z', fix_available_at: '2026-10-11T09:00:00Z', due: { early_warning: '2026-10-10T09:00:00Z', notification: '2026-10-12T09:00:00Z', final: '2026-10-25T09:00:00Z' } };
    expect(checkOf(run('input.json', { clock }), 'clock-arithmetic').ok).toBe(true);
    expect(checkOf(run('input.json', { clock: { ...clock, due: { ...clock.due, final: '2026-10-26T09:00:00Z' } } }), 'clock-arithmetic').ok).toBe(false);
  });
});

describe('stubs and dispatch', () => {
  it.each(['repro', 'bench-delta', 'score-delta', 'ledger-record'] as const)('%s answers inconclusive: not implemented', (cls) => {
    const b = prove(cls, fixture('rerun', 'flake.json'), env);
    expect(b.verdict).toBe('inconclusive');
    expect(b.checks[0]?.detail).toMatch(/inconclusive: not implemented/);
  });

  it('knows all eight classes, and pins every block to the engine', () => {
    expect(PROOF_CLASSES).toHaveLength(8);
    const b = prove('rerun-stats', fixture('rerun', 'flake.json'), env);
    expect(b.engine.version).toBe('1.0.0');
    expect(b.engine.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects an input without a task', () => {
    expect(() => prove('rerun-stats', { claims: [] }, env)).toThrow(EngineError);
    expect(() => prove('exploit-test', { ...fixture('exploit', 'input.pass.json'), diff: 'x', action_class: undefined }, env)).toThrow(/action_class/);
  });
});
