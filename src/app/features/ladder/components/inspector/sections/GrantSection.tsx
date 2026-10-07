import { KeyValue } from '@/components/inspector/KeyValue';
import { TIER_META } from '@/lib/tiers';
import { isMechanical } from '../../../model/rules/promotion';
import { shownName } from '../../../model/rules/tiers';
import type { ClassRow } from '../../../model/types';
import { Sec, type SectionState } from '../Sec';

/** The grant as it stands: tier, ceiling, lease, proof class and the last move. */
export function GrantSection({ cls, proofClass, sections }: { cls: ClassRow; proofClass: string; sections: SectionState }) {
  return (
    <Sec id="grant" title="Grant" defaultOpen={false} sections={sections}>
      <KeyValue
        rows={[
          ['Tier', shownName(cls)],
          ['Ceiling', TIER_META[cls.ceiling].name],
          ['Lease', cls.lease_days ? `${cls.lease_days} d left of 14, then Supervised` : '—'],
          ['Proof class', `${proofClass}${isMechanical(proofClass) ? ' · mechanical' : ''}`],
          ['Last move', cls.lastMove],
        ]}
      />
    </Sec>
  );
}
