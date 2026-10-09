import { KeyValue } from '@/components/inspector/KeyValue';
import { TIER_META } from '@/lib/tiers';
import { isMechanical } from '@/lib/promotion';
import { DemoChip } from '../../chrome/DemoChip';
import { shownName } from '../../../model/rules/tiers';
import type { ClassRow } from '../../../model/types';
import { Sec, type SectionState } from '../Sec';

/** The grant as it stands: tier, ceiling, lease, proof class and the last move. `proofDemo`: the proof class is the demo catalogue's (live). */
export function GrantSection({ cls, proofClass, proofDemo, sections }: { cls: ClassRow; proofClass: string; proofDemo: boolean; sections: SectionState }) {
  return (
    <Sec id="grant" title="Grant" defaultOpen={false} sections={sections}>
      <KeyValue
        rows={[
          ['Tier', shownName(cls)],
          ['Ceiling', TIER_META[cls.ceiling].name],
          ['Lease', cls.lease_days ? `${cls.lease_days} d left of 14, then Supervised` : '—'],
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
