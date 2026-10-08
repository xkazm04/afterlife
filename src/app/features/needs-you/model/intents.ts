// The server intent behind each decision's Run. Pure. A decision with no write (the runner page) has none.
import type { ActionIntent } from '@/server/actions/types';
import { gapIntent } from '../../maturity/model/flow/intent';
import type { Gap } from '../../maturity/model/ctx';

const PROJECT = 'ledgerline';

/**
 * n1 promotes dep-bump.patch to Hands-off (a policy MR), n2 marks the CRA packet #131 ready to sign, n4 re-admits
 * patch-bump at Assisted (a policy MR), g1..g3 open a gap's draft MR. Each names the inbox item it settles.
 */
export function intentFor(key: string, gaps: readonly Gap[]): ActionIntent | null {
  if (key === 'n1') return { kind: 'promote-class', project: PROJECT, class: 'dep-bump.patch', to: 'hands_off', proposal: 'n1' };
  if (key === 'n2') return { kind: 'mark-cra-ready', project: PROJECT, issue: 131, proposal: 'n2' };
  if (key === 'n4') return { kind: 'promote-class', project: PROJECT, class: 'patch-bump', to: 'assisted', proposal: 'n4' };
  const gap = gaps.find((g) => g.id === key);
  const intent = gap ? gapIntent(gap, PROJECT) : null;
  return intent ? { ...intent, proposal: 'n3' } : null;
}
