import { describe, expect, it } from 'vitest';
import type { TierRecord, TierState } from '../../src/schemas/tier';
import { NOW, policy } from '../__tests__/helpers';
import { gate } from './gate';
import { effectiveOf, standingOf } from './standing';

const P = policy();
const AGENT = 'ai-patcher-acme';
const held = (extra: Partial<TierRecord>): TierState => ({
  version: 1, policy_sha: 'x', agents: { [AGENT]: { 'dep-bump.patch': { tier: 'hands_off', since: '2026-10-09', by: 'test', ...extra } } },
});

describe('standing: a hands-off lease the gate cannot read', () => {
  // tier-state.yml is validated for its tiers only, so a typo in lease_expires reaches the gate as text.
  it.each(['next friday', '2026-13-45', 'not-a-date'])('reads lease_expires %j as lapsed: supervised, never hands-off', (lease) => {
    expect(effectiveOf({ tier: 'hands_off', lease_expires: lease }, 'hands_off', NOW)).toEqual({ tier: 'supervised', leaseLapsed: true });
  });

  it('reads a lease of another type (a map, a list, null, empty, a number) as lapsed', () => {
    for (const lease of [{}, ['2099-01-01'], null, '', 1798761600000]) {
      expect(effectiveOf({ tier: 'hands_off', lease_expires: lease as unknown as string }, 'hands_off', NOW).tier).toBe('supervised');
    }
  });

  it('keeps a live lease and a record with no lease hands-off', () => {
    expect(effectiveOf({ tier: 'hands_off', lease_expires: '2099-01-01T00:00:00Z' }, 'hands_off', NOW)).toEqual({ tier: 'hands_off', leaseLapsed: false });
    expect(effectiveOf({ tier: 'hands_off' }, 'hands_off', NOW)).toEqual({ tier: 'hands_off', leaseLapsed: false });
  });

  it('the gate grants supervised, never hands-off, on an unreadable lease', () => {
    const r = gate({ policy: P, state: held({ lease_expires: 'next friday' }), classId: 'dep-bump.patch', agent: AGENT, now: NOW,
      guardrail: { verdict: 'pass' }, proof: undefined });
    expect(r.tier).toBe('supervised');
    expect(standingOf(P.classes, held({ lease_expires: 'next friday' }), 'dep-bump.patch', NOW)).toMatchObject({ kind: 'held', tier: 'supervised', leaseLapsed: true });
  });
});
