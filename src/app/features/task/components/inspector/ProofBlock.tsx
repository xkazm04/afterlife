import { ObjectLink } from '@/components/controls/ObjectLink';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { ReactNode } from 'react';
import { POLICY_SHA } from '../../data/pageFacts';
import type { TaskView } from '../../model/types';
import { derivedVerdict } from '../../model/verdict/verdict';
import styles from './inspector.module.css';

const notHeld = (key: string, what: string): ReactNode => (
  <HonestyChip key={key} kind="unknown">
    {what} not held
  </HonestyChip>
);

/**
 * The Proof Block card: the product's own name for the signed record behind a verdict. States the rule in one sentence and
 * shows the pins this task actually holds (engine, digest, policy, ledger read); any pin it does not hold reads "not held".
 */
export function ProofBlock({ task, ledgerRead }: { task: TaskView; ledgerRead: ReactNode }) {
  const { proof } = task;
  const engineHeld = !!proof.engine && proof.engine !== 'no engine';
  return (
    <InspectorSection title="Proof Block" aux={derivedVerdict(task).verdict}>
      <p className={styles.rule}>The engine&apos;s checks decide the verdict; what the agent says never counts.</p>
      <KeyValue
        rows={[
          ['Engine', engineHeld ? `${proof.engine} · no model` : notHeld('e', 'engine')],
          ['Digest', proof.digest ? <span key="d" className={`${styles.mono} ${styles.pin}`}>{proof.digest}</span> : notHeld('d', 'digest')],
          ['Policy', task.fixture ? <ObjectLink key="p" target={`policy @${POLICY_SHA}`} /> : notHeld('p', 'policy')],
          ['Ledger read', ledgerRead],
        ]}
      />
    </InspectorSection>
  );
}
