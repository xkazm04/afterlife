import { KeyValue } from '@/components/inspector/KeyValue';
import { TIER_META } from '@/lib/tiers';
import { isMechanical } from '@/lib/promotion';
import type { PolicyRules } from '@/server/data/types';
import { DemoChip } from '../../chrome/DemoChip';
import { leaseLeft, noLease } from '../../../model/grant/lease';
import { shownName } from '../../../model/rules/tiers';
import type { ClassRow } from '../../../model/types';
import { Sec } from '../Sec';

/**
 * The grant as it stands: tier, ceiling, lease (of the policy's grant_ttl_days; no line when the policy sets none), proof
 * class and the last move. `proofDemo`: the proof class is the demo catalogue's (live).
 */
export function GrantSection({ cls, policy, proofClass, proofDemo }: { cls: ClassRow; policy: PolicyRules | null; proofClass: string; proofDemo: boolean }) {
  const lease = leaseLeft(cls.lease_days, policy);
  return (
    <Sec title="Grant">
      <KeyValue
        rows={[
          ['Tier', shownName(cls)],
          ['Ceiling', TIER_META[cls.ceiling].name],
          ...(noLease(policy) ? [] : [['Lease', lease ? `${lease}, then Supervised` : '—'] as [string, string]]),
          [
            'Proof class',
            <span key="proof">
              {`${proofClass}${isMechanical(proofClass) ? ' · mechanical' : ''}`} <DemoChip on={proofDemo} what="The proof class (the demo's tracks)" />
            </span>,
          ],
          ['Last move', cls.lastMove],
        ]}
      />
    </Sec>
  );
}
