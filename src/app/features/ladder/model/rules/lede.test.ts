import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import type { ClassRow } from '../types';
import { classLede, enrollLink } from './lede';

const base: ClassRow = { ...DEMO.actionClasses[0]!, pending: null };

describe('classLede', () => {
  it('names the tier and ceiling, then what blocks promotion', () => {
    const line = classLede(base, { kind: 'ceiling' });
    expect(line).toContain('ceiling');
    expect(line).toContain('it is at its ceiling');
  });
  it('says so when eligible, and never points at the removed inspector', () => {
    const p = { kind: 'eligible' as const, next: 'hands_off' as const, rules: [], precondition: 'x' };
    expect(classLede(base, p)).toContain('eligible for');
    expect(classLede(base, { kind: 'notyet', next: 'hands_off', rules: [], precondition: 'x' })).not.toContain('↵');
  });

  it('a class no agent holds links to its track in Setup, where the enrollment MR is sent', () => {
    const t4 = { ...base, track: 'T4', cell: 'no_record' as const };
    expect(classLede(t4, { kind: 'norecord' })).toContain('no agent holds it yet');
    expect(enrollLink(t4, { kind: 'norecord' })).toBe('/setup/track-T4');
    expect(enrollLink({ ...t4, track: 'unknown' }, { kind: 'norecord' })).toBeNull();
    expect(enrollLink(base, { kind: 'ceiling' })).toBeNull();
  });
});
