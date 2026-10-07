import Link from 'next/link';
import { Kbd } from '@/components/controls/Kbd';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TierChip } from '@/components/status/TierChip';
import { Chip } from '@/components/status/chip/Chip';
import { ObjectLink } from '@/components/controls/ObjectLink';
import { hasMarkup } from '../../model/exhibits';
import type { Selection } from '../../model/court/selection';
import type { TaskView } from '../../model/types';
import { verdictGlyph, verdictKind } from '../../model/verdict/verdict';
import { LEDGER_AGE_SEC, PAGE_NOW, POLICY_SHA } from '../../data/pageFacts';
import { Exhibits } from './Exhibits';
import { LedgerRows } from './LedgerRows';
import { SelectionRuling } from './SelectionRuling';
import styles from './inspector.module.css';

export type Panel = 'words' | 'trace' | 'ledger';

/**
 * Layer 2 of the Task screen: the ruling on the selection, the agent's words (untrusted, collapsed), what this counts
 * toward, the exhibits, the ledger rows, the trace and the proof's own facts.
 */
export function TaskInspector({
  task,
  sel,
  row,
  open,
  onOpen,
}: {
  task: TaskView;
  sel: Selection;
  /** The ledger row lit by a running replay. */
  row: number | null;
  open: Record<Panel, boolean>;
  onOpen: (panel: Panel, open: boolean) => void;
}) {
  const kind = verdictKind(task.proof.verdict);
  return (
    <>
      <InspectorHeader
        icon={<span className={kind === 'bad' ? styles.c_bad : kind === 'ok' ? styles.c_ok : undefined}>{verdictGlyph(task.proof.verdict)}</span>}
        title={
          <>
            {task.id}
            <span className={styles.push}>
              <Chip>{task.proof.cls}</Chip>
            </span>
          </>
        }
        sub={task.state}
        path={`${task.agent} · ${task.flowRun}`}
      />
      <InspectorSection title="Selection">
        <SelectionRuling task={task} sel={sel} />
      </InspectorSection>
      <InspectorSection
        title="Agent's words"
        aux={
          <>
            untrusted · <Kbd>w</Kbd>
          </>
        }
        open={open.words}
        onOpenChange={(o) => onOpen('words', o)}
      >
        <div className={`${styles.words} ${styles.noLig}`}>
          <UntrustedText source={task.agent}>{task.agentWords}</UntrustedText>
        </div>
        {hasMarkup(task.agentWords) ? <div className={styles.wordsNote}>tags shown as typed, not obeyed</div> : null}
      </InspectorSection>
      <InspectorSection
        title="Counts toward"
        aux={
          <Link className={styles.ladder} href={`/ladder#${encodeURIComponent(task.cls)}`}>
            Ladder ↗
          </Link>
        }
      >
        <KeyValue
          rows={[
            ['Class', <span key="c" className={styles.mono}>{task.cls}</span>],
            ['Tier now', task.tierNow ? <TierChip key="t" tier={task.tierNow} /> : <HonestyChip key="t" kind="unknown">? unknown</HonestyChip>],
          ]}
        />
        <div className={styles.counts}>{task.countsToward}</div>
      </InspectorSection>
      <InspectorSection title="Exhibits" aux={task.proof.cls}>
        <Exhibits task={task} />
      </InspectorSection>
      <InspectorSection title="Ledger" aux={`${task.ledger.length} rows · reads only`} open={open.ledger} onOpenChange={(o) => onOpen('ledger', o)}>
        <LedgerRows rows={task.ledger} active={row} />
      </InspectorSection>
      <InspectorSection title="trace.jsonl" aux={task.flowRun} open={open.trace} onOpenChange={(o) => onOpen('trace', o)}>
        <pre className={styles.trace}>{task.trace.join('\n')}</pre>
      </InspectorSection>
      <InspectorSection title="Proof" defaultOpen={false}>
        <KeyValue
          rows={[
            ['Engine', `${task.proof.engine} · no model`],
            ['Digest', <span key="d" className={styles.mono}>{task.proof.digest}</span>],
            ['Policy', <ObjectLink key="p" target={`policy @${POLICY_SHA}`} />],
            ['Ledger read', `${LEDGER_AGE_SEC} s ago · ${PAGE_NOW}`],
          ]}
        />
      </InspectorSection>
    </>
  );
}
