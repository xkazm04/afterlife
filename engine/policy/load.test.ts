import { describe, expect, it } from 'vitest';
import { policy } from '../__tests__/helpers';
import { PROOF_CLASSES } from '../../src/schemas/proof';
import { DEMOTION_TRIGGERS as SCHEMA_TRIGGERS } from '../../src/schemas/tier';
import { DEMOTION_TRIGGERS, parsePolicy } from './load';

const base = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...(policy() as unknown as Record<string, unknown>),
  demotion: { one_step_on: ['revert'], quarantine_on: ['guardrail_high'] },
  ...over,
});

describe('parsePolicy: demotion triggers', () => {
  it('takes the trigger list from the schema: one definition, not a copy', () => {
    expect(SCHEMA_TRIGGERS).toHaveLength(6);
    expect(DEMOTION_TRIGGERS).toBe(SCHEMA_TRIGGERS);
  });

  it('accepts every trigger the tripwire can fire, in either list', () => {
    expect(DEMOTION_TRIGGERS).toHaveLength(6);
    expect(() => parsePolicy(base({ demotion: { one_step_on: [...DEMOTION_TRIGGERS], quarantine_on: [...DEMOTION_TRIGGERS] } }))).not.toThrow();
  });

  it('refuses a trigger the tripwire never fires: a typo would silently disarm the demotion', () => {
    for (const list of ['one_step_on', 'quarantine_on'] as const) {
      const demotion = { one_step_on: [], quarantine_on: [], [list]: ['guardrail_hgh'] };
      expect(() => parsePolicy(base({ demotion })), list).toThrow(new RegExp(`demotion.${list} names "guardrail_hgh"`));
    }
  });
});

describe('parsePolicy: rerun_stats thresholds', () => {
  it('accepts the shipped block, a partial block and no block', () => {
    expect(() => parsePolicy(base({ rerun_stats: { min_runs: 5, real_failure_rate: 0.8 } }))).not.toThrow();
    expect(() => parsePolicy(base({ rerun_stats: { real_failure_rate: 1 } }))).not.toThrow();
    expect(() => parsePolicy(base({ rerun_stats: {} }))).not.toThrow();
  });

  it('refuses a threshold that is not a usable number: a NaN rate would call every real failure a flake', () => {
    const bad: [Record<string, unknown>, RegExp][] = [
      [{ real_failure_rate: '0,8' }, /real_failure_rate must be a number/],
      [{ real_failure_rate: 0 }, /above 0 and at most 1/],
      [{ real_failure_rate: 80 }, /above 0 and at most 1/],
      [{ min_runs: '5' }, /min_runs must be a number/],
      [{ min_runs: 0 }, /whole number of at least 1/],
      [{ min_runs: 2.5 }, /whole number of at least 1/],
    ];
    for (const [block, message] of bad) expect(() => parsePolicy(base({ rerun_stats: block })), JSON.stringify(block)).toThrow(message);
    expect(() => parsePolicy(base({ rerun_stats: 5 }))).toThrow(/rerun_stats must be an object/);
  });
});

describe('parsePolicy: bench_delta ceiling', () => {
  it('accepts a fraction in [0, 1) or no ceiling, and refuses one that is not: a NaN ceiling lets every tolerance through', () => {
    for (const bench_delta of [{ max_tolerance: 0.1 }, { max_tolerance: 0 }, {}]) expect(() => parsePolicy(base({ bench_delta })), JSON.stringify(bench_delta)).not.toThrow();
    for (const max_tolerance of [-0.1, 1, 5]) expect(() => parsePolicy(base({ bench_delta: { max_tolerance } })), String(max_tolerance)).toThrow(/max_tolerance must be a fraction in \[0, 1\)/);
    expect(() => parsePolicy(base({ bench_delta: { max_tolerance: '0.1' } }))).toThrow(/max_tolerance must be a number/);
    expect(() => parsePolicy(base({ bench_delta: 0.1 }))).toThrow(/bench_delta must be an object/);
  });
});

describe('parsePolicy: cooldown_days', () => {
  it('refuses a negative cooldown: the tripwire would stamp a cooldown_until that ended before the demotion', () => {
    expect(() => parsePolicy(base({ cooldown_days: -7 }))).toThrow(/cooldown_days must be 0 or more/);
    for (const d of [0, 7, 0.5]) expect(() => parsePolicy(base({ cooldown_days: d })), String(d)).not.toThrow();
  });
});

describe('parsePolicy: proof classes', () => {
  it('refuses a class proof or a production proof the engine has no class for: a typo blocks every proof of that class', () => {
    const classes = (proof: unknown) => ({ ...(base().classes as Record<string, unknown>), 'x.y': { agent: 'patcher', ceiling: 'supervised', proof } });
    expect(() => parsePolicy(base({ classes: classes('exploit_test') }))).toThrow(/classes.x.y.proof "exploit_test" is not a proof class/);
    expect(() => parsePolicy(base({ classes: classes(3) }))).toThrow(/classes.x.y.proof "3" is not a proof class/);
    const envelope = (req: unknown) => ({ ...(base().envelope as Record<string, unknown>), production_requires_proof: req });
    expect(() => parsePolicy(base({ envelope: envelope(['exploit-test', 'rerun_stats']) }))).toThrow(/production_requires_proof names "rerun_stats"/);
  });

  it('accepts every proof class, and a class that declares none (the gate blocks it)', () => {
    for (const proof of PROOF_CLASSES) expect(() => parsePolicy(base({ classes: { a: { agent: 'x', ceiling: 'assisted', proof } } })), proof).not.toThrow();
    expect(() => parsePolicy(base({ classes: { a: { agent: 'x', ceiling: 'assisted' } } }))).not.toThrow();
  });
});
