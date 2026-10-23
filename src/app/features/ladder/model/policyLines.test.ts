// The policy popover's lines (data/policy.ts policyLines), from trust-policy.yml as the server read it. A list the policy
// leaves empty is a rule too (nothing demotes, no environment is in the envelope), and its line says so instead of a
// blank or a dangling separator. The test sits here: data/ is at its 10-file cap.
import { describe, expect, it } from 'vitest';
import { repoPolicy } from '@/server/data/policy';
import type { PolicyRules } from '@/server/data/types';
import { policyLines } from '../data/policy';

const policy = repoPolicy() as PolicyRules;
const with_ = (o: Partial<PolicyRules>): PolicyRules => ({ ...policy, ...o });

describe('policyLines', () => {
  it('words the triggers and the envelope the policy names', () => {
    const l = policyLines(with_({ oneStepOn: ['revert'], quarantineOn: ['guardrail_high', 'revert'], cooldownDays: 3, envelope: { maxFiles: 5, maxLines: 200, environments: ['review/*'] } }));
    expect(l).toEqual({ oneStepDown: 'revert · 3 d cooldown', toQuarantined: 'guardrail high-severity block · revert', envelope: '≤ 5 files · ≤ 200 lines · review/*' });
  });
  it('an empty trigger list reads as no trigger, not a blank line or a leading separator', () => {
    const l = policyLines(with_({ oneStepOn: [], quarantineOn: [], cooldownDays: 3 }));
    expect(l.oneStepDown).toBe('no trigger · 3 d cooldown');
    expect(l.toQuarantined).toBe('no trigger');
  });
  it('an envelope with no environments says none is allowed, not a trailing separator', () => {
    expect(policyLines(with_({ envelope: { maxFiles: 5, maxLines: 200, environments: [] } })).envelope).toBe('≤ 5 files · ≤ 200 lines · no environment');
  });
});
