// The re-admit card's cooldown is trust-policy.yml's cooldown_days as the server read it, never a constant.
import { afterAll, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { pickNeedsYouDemo } from '../pick';
import { readmitCooldown } from '../readmit';

afterAll(() => setDataSource(null));

describe('the re-admit cooldown', () => {
  it("says the policy's cooldown_days", () => {
    expect(readmitCooldown(10)).toEqual({ cooldown: '10 d before any promotion', doesNot: ['restore Supervised, the old tier', 'lift the 10-day promotion cooldown', 'reopen or merge !44'] });
  });
  it('says the policy was not read, never a number it did not read', () => {
    expect(readmitCooldown(null).cooldown).toBe('not known: trust-policy.yml was not read');
  });
  it('the desk carries the cooldown_days the source read', () => {
    setDataSource({ ...demoSource, getPolicy: () => ({ ...demoSource.getPolicy()!, cooldownDays: 3 }) });
    expect(pickNeedsYouDemo().readmit.cooldownDays).toBe(3);
  });
});
