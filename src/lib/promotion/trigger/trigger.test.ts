import { describe, expect, it } from 'vitest';
import { displayLastMove, isTrigger, TRIGGER_NOT_RECORDED, TRIGGER_WORDS, triggerWords } from './trigger';

describe('which trigger fired, in words', () => {
  it('words exactly the six defined triggers', () => {
    expect(Object.keys(TRIGGER_WORDS)).toEqual(['revert', 'reopened_finding', 'post_merge_proof_fail', 'default_branch_red_1h', 'guardrail_high', 'budget_breach_x2']);
    expect(triggerWords('guardrail_high')).toBe('guardrail high-severity block');
    expect(isTrigger('toString')).toBe(false);
  });
  it('an unrecognised or missing trigger says so and invents none', () => {
    expect([triggerWords('made_up'), triggerWords(null), triggerWords(undefined), triggerWords('toString')]).toEqual(Array(4).fill(TRIGGER_NOT_RECORDED));
  });
  it('the stored Last move text: the trigger worded, the word tripwire kept', () => {
    expect(displayLastMove('4 min ago · tripwire · guardrail_high')).toBe('4 min ago · tripwire · guardrail high-severity block');
    expect(displayLastMove('tripwire · budget_breach_x2')).toBe('tripwire · budget breach twice');
  });
  it('the older text with no trigger, and an unknown one, read as not recorded', () => {
    expect(displayLastMove('4 min ago · tripwire')).toBe('4 min ago · tripwire · trigger not recorded');
    expect(displayLastMove('3 d ago · tripwire · whatever')).toBe('3 d ago · tripwire · trigger not recorded');
  });
  it('leaves every other move as it was', () => {
    for (const t of ['promoted 5 d ago', 'no change', 'demoted patch-bump 4 min ago', 'unknown']) expect(displayLastMove(t)).toBe(t);
  });
});
