import { describe, expect, it } from 'vitest';
import { GRADES } from '../../data/cra';
import { gradeIndex, gradeState, linksUnresolved } from './grades';

describe('packet grade ladder', () => {
  it('is reviewable until the sign-off is sent, then ready to sign', () => {
    expect(GRADES[gradeIndex('open', '6 / 6')]?.name).toBe('reviewable');
    expect(GRADES[gradeIndex('staged', '6 / 6')]?.name).toBe('reviewable');
    expect(GRADES[gradeIndex('sent', '6 / 6')]?.name).toBe('ready to sign');
  });
  it('is draft while a link is unresolved, whatever the status', () => {
    expect(GRADES[gradeIndex('open', '5 / 6')]?.name).toBe('draft');
    expect(GRADES[gradeIndex('sent', '5/6')]?.name).toBe('draft');
  });
  it('reads an unreadable count as no claim, not as draft', () => {
    expect(linksUnresolved('')).toBe(false);
    expect(linksUnresolved('all')).toBe(false);
    expect(linksUnresolved('6 / 6')).toBe(false);
    expect(GRADES[gradeIndex('open', '')]?.name).toBe('reviewable');
  });
  it('never offers "attested": the ladder stops at ready to sign', () => {
    expect(GRADES.map((g) => g.name)).toEqual(['draft', 'reviewable', 'ready to sign']);
  });
  it('draws the current rung amber, the last rung green, the others plain', () => {
    expect(gradeState(1, 1)).toBe('cur');
    expect(gradeState(2, 2)).toBe('done');
    expect(gradeState(0, 1)).toBe('idle');
    expect(gradeState(2, 1)).toBe('idle');
  });
});
