import type { NeedsYouItem } from '@/lib/demo';
import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { commandLines, type WriteView } from '@/server/actions/words';
import type { DeskIntent } from '../../model/desk';
import type { LiveEvidence as Evidence } from '../../model/evidence/evidence';
import { diffFile, elsewhere, runLabel, type LiveAnswer } from '../../model/live';
import { policyNote } from '../../model/outbox/policy';
import { LiveEvidence } from './LiveEvidence';
import styles from './live.module.css';

export interface LiveActProps {
  item: NeedsYouItem;
  /** Null: this list sends nothing for the item. A policy MR, or a live gap's template MR. */
  intent: DeskIntent | null;
  /** The server's preview of the write, or why there is none; undefined while it is asked for. */
  view: WriteView | undefined;
  answer: LiveAnswer | undefined;
  /** The item's class as it is now; undefined: none joined (the rule counts alone are drawn). */
  evidence?: Evidence;
  sending: boolean;
  onRun: () => void;
  onRetry: () => void;
}

/**
 * A selected live item: its rule counts and its class as it is now, then the exact write the server planned (commands and diff) under what Run does
 * with it, Run itself, and the answer. Run is closed when the class moved since the proposal. A preview that failed says
 * why and can be asked for again. Nothing runs before Run.
 */
export function LiveAct({ item, intent, view, answer, evidence, sending, onRun, onRetry }: LiveActProps) {
  if (!intent) return <div className={styles.note}>{elsewhere(item.kind)}</div>;
  const done = answer?.status === 'done';
  const closed = evidence?.kind === 'class' && !evidence.canRun;
  return (
    <div className={styles.act}>
      {item.rules?.length ? (
        <ul className={styles.rules} aria-label="The promotion rule, as the last poll counted it">
          {item.rules.map(([name, value, met]) => (
            <li key={name} className={met ? styles.met : styles.unmet}>
              {met ? '✓' : '✗'} {name} <b>{value}</b>
            </li>
          ))}
        </ul>
      ) : null}
      {evidence ? <LiveEvidence evidence={evidence} /> : null}
      <div className={styles.note}>{policyNote(view)}</div>
      {view?.kind === 'preview' ? (
        <>
          <CommandBlock commands={commandLines(view.preview)} />
          <DiffBlock file={diffFile(intent, view.preview.branch)} lines={parseDiff(view.preview.diff)} />
          {done ? null : (
            <div className={styles.row}>
              <Button variant="primary" onClick={onRun} disabled={sending || closed}
                title={closed ? 'Closed: the class moved since this was proposed' : 'Confirms this exact write by its preview id'}>
                {sending ? 'Sending…' : runLabel(item.kind)}
              </Button>
              <span className={styles.note}>A person merges the MR in GitLab; Belay never does.</span>
            </div>
          )}
        </>
      ) : null}
      {view?.kind === 'refused' ? (
        <div className={styles.row}>
          <Button onClick={onRetry}>Ask again</Button>
        </div>
      ) : null}
      {answer ? (
        <div role="status" className={done ? styles.done : styles.bad}>
          {answer.text}
        </div>
      ) : null}
    </div>
  );
}
