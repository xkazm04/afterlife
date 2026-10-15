// A grant's lease and the no-edit bar, worded from trust-policy.yml as the server read it (PolicyRules), never a
// constant here: the lease is grant_ttl_days, the bar supervised_to_hands_off's no_edit_ratio.
import type { PolicyRules } from '@/server/data/types';

/** The policy grants no lease (no grant_ttl_days): no lease line at all. A policy not read is not that. */
export const noLease = (policy: PolicyRules | null): boolean => policy !== null && policy.leaseDays === null;

/** "9 d left of 14" (of the policy's lease), "9 d left" when the policy was not read, null when there is no lease. */
export function leaseLeft(left: number | null, policy: PolicyRules | null): string | null {
  if (!left || noLease(policy)) return null;
  return policy?.leaseDays ? `${left} d left of ${policy.leaseDays}` : `${left} d left`;
}

/** Merged without edits below the policy's bar to Hands-off. Never short when the policy was not read. */
export const belowNoEdit = (noEdit: number, policy: PolicyRules | null): boolean => !!policy && noEdit < policy.toHandsOff.noEditRatio;
