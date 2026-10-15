import { KeyValue } from '@/components/inspector/KeyValue';
import { GateSeenLine } from '@/components/status/GateSeenLine';
import { DEMO_NOW } from '@/lib/demo/clock';
import { TIER_META } from '@/lib/tiers';
import { cellOf, isMechanical, NOT_RECORDED, RUNGS } from '@/lib/promotion';
import type { PolicyRules } from '@/server/data/types';
import { DemoChip } from '../../chrome/DemoChip';
import { leaseLeft, noLease } from '../../../model/grant/lease';
import { shownName } from '../../../model/rules/tiers';
import type { ClassRow } from '../../../model/types';
import { Sec } from '../Sec';
import styles from './sections.module.css';

/** "12 of 15 accepted": the accepted outputs belay-apply's gate decided. Not recorded when the record does not say. */
const gatedText = (r: NonNullable<ClassRow['record']>): string =>
  r.gated === null || r.gated === undefined || r.accepted === null ? NOT_RECORDED : `${r.gated} of ${r.accepted} accepted`;

/**
 * The grant as it stands: tier, ceiling, lease (of the policy's grant_ttl_days; no line when the policy sets none), proof
 * class, the last move, the gated outputs, and the gate last seen deciding for the holder (a class one agent holds at a
 * tier). `proofDemo`: the proof class is the demo catalogue's (live). `live`: demo mode reads the gate against the demo's
 * own clock and marks it demo (illustrative: the demo has no ledger).
 */
export function GrantSection({ cls, policy, proofClass, proofDemo, live }: { cls: ClassRow; policy: PolicyRules | null; proofClass: string; proofDemo: boolean; live: boolean }) {
  const lease = leaseLeft(cls.lease_days, policy);
  const held = (RUNGS as readonly string[]).includes(cellOf(cls) ?? '');
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
          ...(held && cls.record ? [['Gated outputs', gatedText(cls.record)] as [string, string]] : []),
        ]}
      />
      {held ? (
        <div className={styles.note}>
          <GateSeenLine gate={cls.gateSeen} since={cls.since} now={live ? undefined : DEMO_NOW} demo={!live} />
        </div>
      ) : null}
    </Sec>
  );
}
