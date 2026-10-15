import { describe, expect, it } from 'vitest';
import { policy } from '../__tests__/helpers';
import { DEMOTION_TRIGGERS, parsePolicy } from './load';

const base = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...(policy() as unknown as Record<string, unknown>),
  demotion: { one_step_on: ['revert'], quarantine_on: ['guardrail_high'] },
  ...over,
});

describe('parsePolicy: demotion triggers', () => {
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
