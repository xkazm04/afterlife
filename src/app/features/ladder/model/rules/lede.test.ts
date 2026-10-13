import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import type { ClassRow } from '../types';
import { classLede } from './lede';

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
});
