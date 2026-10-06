import { describe, expect, it } from 'vitest';
import { GRADES } from '../../data/cra';
import { gradeIndex, gradeState, nextGrade } from './grades';

describe('packet grade ladder', () => {
  it('is reviewable until the sign-off is sent, then ready to sign', () => {
    expect(GRADES[gradeIndex('open')]?.name).toBe('reviewable');
    expect(GRADES[gradeIndex('staged')]?.name).toBe('reviewable');
    expect(GRADES[gradeIndex('sent')]?.name).toBe('ready to sign');
  });
  it('never offers "attested": the ladder stops at ready to sign', () => {
    expect(GRADES.map((g) => g.name)).toEqual(['draft', 'reviewable', 'ready to sign']);
    expect(nextGrade(2)).toBe(2);
    expect(nextGrade(0)).toBe(1);
  });
  it('draws the current rung amber, the last rung green, the others plain', () => {
    expect(gradeState(1, 1)).toBe('cur');
    expect(gradeState(2, 2)).toBe('done');
    expect(gradeState(0, 1)).toBe('idle');
    expect(gradeState(2, 1)).toBe('idle');
  });
});
