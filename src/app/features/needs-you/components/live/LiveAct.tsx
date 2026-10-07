import type { NeedsYouItem } from '@/lib/demo';
import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import type { PromoteClass } from '@/server/actions/types';
import { commandLines, type WriteView } from '@/server/actions/words';
import { elsewhere, runLabel, type LiveAnswer } from '../../model/live';
import { policyNote } from '../../model/outbox/policy';
import styles from './live.module.css';

const FILE = 'belay-policy · tier-state.yml';

export interface LiveActProps {
  item: NeedsYouItem;
  /** Null: this list sends nothing for the item. */
  intent: PromoteClass | null;
  /** The server's preview of the write, or why there is none; undefined while it is asked for. */
  view: WriteView | undefined;
  answer: LiveAnswer | undefined;
  sending: boolean;
  onRun: () => void;
  onRetry: () => void;
}

/**
 * A selected live item: its rule counts, then the exact write the server planned (commands and diff) under what Run does
 * with it, Run itself, and the answer. A preview that failed says why and can be asked for again. Nothing runs before Run.
 */
export function LiveAct({ item, intent, view, answer, sending, onRun, onRetry }: LiveActProps) {
  if (!intent) return <div className={styles.note}>{elsewhere(item.kind)}</div>;
  const done = answer?.status === 'done';
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
      <div className={styles.note}>{policyNote(view)}</div>
      {view?.kind === 'preview' ? (
        <>
          <CommandBlock commands={commandLines(view.preview)} />
          <DiffBlock file={FILE} lines={parseDiff(view.preview.diff)} />
          {done ? null : (
            <div className={styles.row}>
              <Button variant="primary" onClick={onRun} disabled={sending} title="Confirms this exact write by its preview id">
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
