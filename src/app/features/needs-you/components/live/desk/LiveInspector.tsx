import type { Ref } from 'react';
import { Button } from '@/components/controls/Button';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import type { WriteView } from '@/server/actions/words';
import { canStage, type DeskGroup, type DeskItem } from '../../../model/desk';
import type { LiveEvidence } from '../../../model/evidence/evidence';
import { shortAge, utcStamp } from '../../../model/clock/age';
import type { LiveAnswer } from '../../../model/live';
import { MoveCell } from '../../table/MoveCell';
import { LiveAct } from '../LiveAct';
import { moveOf } from './LiveTable';
import styles from './desk.module.css';

export interface LiveInspectorProps {
  /** The selected row, or null (a group row or nothing selected). */
  item: DeskItem | null;
  /** The selected group, when a group row is selected. */
  group: DeskGroup | null;
  view: WriteView | undefined;
  answer: LiveAnswer | undefined;
  evidence: LiveEvidence | undefined;
  sending: boolean;
  staged: boolean;
  /** Run all is out: staging is closed until it finishes. */
  running: boolean;
  now: Date;
  inspectorRef: Ref<HTMLDivElement>;
  onRun: () => void;
  onRetry: () => void;
  onStage: () => void;
}

/** A decided row: what was decided, when (UTC) and by whom; who is unknown when the act did not record it. */
function Decided({ item }: { item: DeskItem }) {
  return (
    <InspectorSection title="Decided">
      <KeyValue
        rows={[
          ['when', utcStamp(item.actedAt)],
          ['by', item.actedAs],
          ['project', item.project],
        ]}
      />
    </InspectorSection>
  );
}

/**
 * The selected row: its move and age, then "The click": what the click writes, the server's commands and diff from the
 * preview, Stage (for Run all) and Run. A read-only row says where to act instead; a decided row says when and by whom.
 */
export function LiveInspector({ inspectorRef, ...p }: LiveInspectorProps) {
  const { item: n } = p;
  return (
    <div ref={inspectorRef} tabIndex={-1} className={styles.insp} aria-label="The selected decision">
      {!n ? (
        <p className={styles.empty}>
          {p.group ? `${p.group.name} · ${p.group.items.length}: select a row to see the write its click sends.` : 'Select a decision to see the write its click sends.'}
        </p>
      ) : (
        <>
          <InspectorHeader
            title={n.title}
            sub={
              <span className={styles.row}>
                <MoveCell move={moveOf(n)} />
                <span>{n.kind === 'decided' ? `decided ${shortAge(n.actedAt, p.now) ?? '?'} ago` : `waiting ${shortAge(n.openedAt, p.now) ?? 'since an unknown time'}`}</span>
              </span>
            }
            path={n.project}
          />
          {n.kind === 'decided' ? <Decided item={n} /> : null}
          {n.source ? (
            <InspectorSection title="The click">
              {n.source.reason ? <div>{n.source.reason}</div> : null}
              <div className={styles.note}>{n.source.does}</div>
              {n.readOnly ? <div className={styles.note}>{n.readOnly}</div> : null}
              {n.intent ? (
                <>
                  <div className={styles.row}>
                    <Button variant={p.staged ? 'ghost' : 'accent'} disabled={p.running || !canStage(n)} onClick={p.onStage}
                      title={p.staged ? 'Take it out of the outbox' : 'Into the outbox: Run all confirms it there, in staging order'}>
                      {p.staged ? 'Unstage' : 'Stage'}
                    </Button>
                  </div>
                  <LiveAct item={n.source} intent={n.intent} view={p.view} answer={p.answer} evidence={p.evidence} sending={p.sending} onRun={p.onRun} onRetry={p.onRetry} />
                </>
              ) : null}
            </InspectorSection>
          ) : null}
        </>
      )}
    </div>
  );
}
