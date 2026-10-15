import { describe, expect, it } from 'vitest';
import { repoPolicy } from '@/server/data/policy';
import type { PolicyRules } from '@/server/data/types';
import { belowNoEdit, leaseLeft, noLease } from './lease';

const policy = repoPolicy() as PolicyRules;
const with_ = (o: Partial<PolicyRules>): PolicyRules => ({ ...policy, ...o });

describe('leaseLeft', () => {
  it('is of the policy lease (grant_ttl_days), never a constant', () => {
    expect(leaseLeft(9, with_({ leaseDays: 7 }))).toBe('9 d left of 7');
    expect(leaseLeft(9, with_({ leaseDays: 30 }))).toBe('9 d left of 30');
  });
  it('a policy with no lease: no lease line at all', () => {
    expect(noLease(with_({ leaseDays: null }))).toBe(true);
    expect(leaseLeft(9, with_({ leaseDays: null }))).toBeNull();
  });
  it('a policy not read: the days left, of nothing it can name', () => {
    expect(noLease(null)).toBe(false);
    expect(leaseLeft(9, null)).toBe('9 d left');
  });
  it('no lease on the class: none', () => {
    expect(leaseLeft(null, policy)).toBeNull();
    expect(leaseLeft(0, policy)).toBeNull();
  });
});

describe('belowNoEdit', () => {
  it('reads the policy no_edit_ratio', () => {
    expect(belowNoEdit(0.85, with_({ toHandsOff: { ...policy.toHandsOff, noEditRatio: 0.8 } }))).toBe(false);
    expect(belowNoEdit(0.85, with_({ toHandsOff: { ...policy.toHandsOff, noEditRatio: 0.9 } }))).toBe(true);
  });
  it('is never short when the policy was not read', () => {
    expect(belowNoEdit(0.1, null)).toBe(false);
  });
});
