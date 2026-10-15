// trust-policy.yml's optional `trial: {min, catches}` on a promotion step: read by rulesOf as `gated` is (absent, or not a
// positive min and a catches of 0 or more: no row, today's rows unchanged), and drawn as one row of the step it is on.
import { describe, expect, it } from 'vitest';
import { parsePolicy } from '../../../../engine/policy/load';
import { repoPolicy, rulesOf } from '@/server/data/policy';
import { promotion, toHandsOffRules, toSupervisedRules, trialRule, whyNot, type Counters } from '..';

const RULES = repoPolicy()!;
const rec = (o: Partial<Counters> = {}): Counters => ({ accepted: 16, needed: null, noEdit: 0.95, cleanDays: 15, reverts: 0, gated: 16, ...o });
const withStep = (step: 'assisted_to_supervised' | 'supervised_to_hands_off', trial: unknown) => {
  const raw = parsePolicy({
    version: 1, cooldown_days: 7, classes: {}, demotion: { one_step_on: [], quarantine_on: [] },
    envelope: { hands_off: { max_files: 6, max_lines: 120, environments: [] } },
    promotion: {
      assisted_to_supervised: { accepted: 5, reverts: 0, ...(step === 'assisted_to_supervised' ? { trial } : {}) },
      supervised_to_hands_off: { accepted: 15, no_edit_ratio: 0.9, clean_days: 14, human_key: true, ...(step === 'supervised_to_hands_off' ? { trial } : {}) },
    },
  });
  return rulesOf(raw)!;
};

describe('the trial key on a promotion step', () => {
  it('the repo policy sets none: no trial row on either step', () => {
    expect([RULES.toSupervised.trial, RULES.toHandsOff.trial]).toEqual([undefined, undefined]);
    expect(toHandsOffRules(rec({ trial: { n: 0, catches: 9 } }), RULES.toHandsOff, 'repro').map((r) => r.name)).not.toContain('next-rung trial');
  });

  it('rulesOf reads it on the step it is on, and only a positive min with a catches of 0 or more', () => {
    expect(withStep('supervised_to_hands_off', { min: 15, catches: 0 }).toHandsOff.trial).toEqual({ min: 15, catches: 0 });
    expect(withStep('assisted_to_supervised', { min: 5, catches: 1 }).toSupervised.trial).toEqual({ min: 5, catches: 1 });
    for (const bad of [{ min: 0, catches: 0 }, { min: 15 }, { min: 1.5, catches: 0 }, { min: 15, catches: -1 }, 'yes', null]) {
      expect(withStep('supervised_to_hands_off', bad).toHandsOff.trial).toBeUndefined();
    }
  });

  it('the row: n of min, c caught; met only with n >= min and catches <= max; not recorded when the record does not state it', () => {
    const t = { min: 15, catches: 0 };
    expect(trialRule(rec({ trial: { n: 15, catches: 0 } }), t)).toEqual({ name: 'next-rung trial', value: '15 of 15, 0 caught', met: true, cells: [15, 15] });
    expect(trialRule(rec({ trial: { n: 9, catches: 0 } }), t)?.met).toBe(false);
    expect(trialRule(rec({ trial: { n: 25, catches: 1 } }), t)?.met).toBe(false);
    expect(trialRule(rec({ trial: { n: 25, catches: 1 } }), { min: 15, catches: 1 })?.met).toBe(true);
    expect(trialRule(rec({ trial: null }), t)).toEqual({ name: 'next-rung trial', value: 'not recorded', met: false });
    expect(trialRule(rec(), t)?.value).toBe('not recorded');
    expect(trialRule(rec(), undefined)).toBeNull();
  });

  it('on Assisted to Supervised too, and promotion() names it', () => {
    const up = { ...RULES.toSupervised, trial: { min: 5, catches: 0 } };
    expect(toSupervisedRules(rec({ accepted: 5, trial: { n: 6, catches: 2 } }), up).at(-1)).toMatchObject({ name: 'next-rung trial', value: '6 of 5, 2 caught', met: false });
    const p = promotion({ tier: 'supervised', ceiling: 'hands_off', record: rec({ trial: { n: 4, catches: 0 } }) }, 'repro', { ...RULES, toHandsOff: { ...RULES.toHandsOff, trial: { min: 15, catches: 0 } } });
    expect(whyNot(p)).toBe('next-rung trial is not met (4 of 15, 0 caught)');
  });
});
