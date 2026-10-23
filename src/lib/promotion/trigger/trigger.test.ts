import { describe, expect, it } from 'vitest';
import { DEMOTION_TRIGGERS } from '@/schemas/tier';
import { displayLastMove, isTrigger, TRIGGER_NOT_RECORDED, TRIGGER_WORDS, triggerWords } from './trigger';

describe('which trigger fired, in words', () => {
  it("words exactly the schema's demotion triggers", () => {
    expect(Object.keys(TRIGGER_WORDS)).toEqual([...DEMOTION_TRIGGERS]);
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
