import type { ReactNode } from 'react';
import { KeyValue } from '@/components/inspector/KeyValue';
import { GateSeenLine } from '@/components/status/GateSeenLine';
import { DEMO_NOW } from '@/lib/demo/clock';
import { TIER_META } from '@/lib/tiers';
import { cellOf, isMechanical, NOT_RECORDED, RUNGS, rungIndex } from '@/lib/promotion';
import type { Ceiling } from '@/schemas/tier';
import type { PolicyRules } from '@/server/data/types';
import { DemoChip } from '../../chrome/DemoChip';
import { leaseLapsed, leaseLeft, noLease } from '../../../model/grant/lease';
import { shownName } from '../../../model/rules/tiers';
import type { ClassRow } from '../../../model/types';
import { Sec } from '../Sec';
import styles from './sections.module.css';

/** "12 of 15 accepted": the accepted outputs belay-apply's gate decided. Not recorded when the record does not say. */
const gatedText = (r: NonNullable<ClassRow['record']>): string =>
  r.gated === null || r.gated === undefined || r.accepted === null ? NOT_RECORDED : `${r.gated} of ${r.accepted} accepted`;

/** "16 resolved, 0 caught": the next rung's trial (never applied). Not recorded when the record does not say. */
const trialText = (r: NonNullable<ClassRow['record']>): string => (r.trial ? `${r.trial.n} resolved, ${r.trial.catches} caught` : NOT_RECORDED);

/**
 * The grant as it stands: tier, ceiling, lease (of the policy's grant_ttl_days; no line when the policy sets none), proof
 * class, the last move, the gated outputs, the next rung's trial (below a ceiling of Supervised or Hands-off), and the
 * gate last seen deciding for the holder (a class one agent holds at a tier). `proofDemo`: the proof class is the demo catalogue's (live). `live`: demo mode reads the gate against the demo's
 * own clock and marks it demo (illustrative: the demo has no ledger).
 */
export function GrantSection({ cls, policy, proofClass, proofDemo, live }: { cls: ClassRow; policy: PolicyRules | null; proofClass: string; proofDemo: boolean; live: boolean }) {
  const lease = leaseLeft(cls.lease_days, policy);
  const lapsed = leaseLapsed(cls); // gated at Supervised, policy or not
  const held = (RUNGS as readonly string[]).includes(cellOf(cls) ?? '');
  // the rung above, under the ceiling, where its decision acts alone (supervised approves, hands_off merges): its trial
  const at = rungIndex(cellOf(cls) as Ceiling);
  const above = held && at < rungIndex(cls.ceiling) ? RUNGS[at + 1] : undefined;
  const next = above === 'supervised' || above === 'hands_off' ? above : undefined;
  return (
    <Sec title="Grant">
      <KeyValue
        rows={[
          ['Tier', shownName(cls)],
          ['Ceiling', TIER_META[cls.ceiling].name],
          ...(lapsed
            ? [['Lease', 'lapsed · gated at Supervised until a person re-confirms'] as [string, string]]
            : noLease(policy) ? [] : [['Lease', lease ? `${lease}, then Supervised` : '—'] as [string, string]]),
          [
            'Proof class',
            <span key="proof">
              {`${proofClass}${isMechanical(proofClass) ? ' · mechanical' : ''}`} <DemoChip on={proofDemo} what="The proof class (the demo's tracks)" />
            </span>,
          ],
          ['Last move', cls.lastMove],
          ...(held && cls.record ? [['Gated outputs', gatedText(cls.record)] as [string, string]] : []),
          // the next rung's trial, shown whether or not the policy asks it yet (a row of the rule only when it does)
          ...(held && cls.record && next ? [[
            `Trial at ${TIER_META[next].name}`,
            <span key="trial" title="What the gate would have done one rung up, against what people did; never applied">
              {trialText(cls.record)} <DemoChip on={!live && !!cls.record.trial} what="The next-rung trial (the demo's own)" />
            </span>,
          ] as [string, ReactNode]] : []),
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
