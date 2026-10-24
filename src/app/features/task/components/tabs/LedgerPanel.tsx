import type { TaskView } from '../../model/types';
import { ledgerCheckLabel } from '../../model/verdict/replay';
import { LedgerRows } from './LedgerRows';
import styles from './tabs.module.css';

/**
 * The Ledger tab: the hash-chained rows behind the verdict at the pane's width, then the flow run's trace.jsonl. Both are
 * read only; the trace is the agent's untrusted output, shown exactly as written.
 */
export function LedgerPanel({ task, row }: { task: TaskView; row: number | null }) {
  return (
    <div className={styles.ledger}>
      <section aria-label="Ledger">
        <h2 className={styles.h}>
          Ledger
          <span className={styles.aux}>
            {task.ledger.length} rows · {ledgerCheckLabel(task.ledgerCheck)} · reads only
          </span>
        </h2>
        {task.ledger.length ? <LedgerRows rows={task.ledger} active={row} /> : <p className={styles.muted}>No ledger rows are held for this task</p>}
      </section>
      <section aria-label="trace.jsonl">
        <h2 className={styles.h}>
          trace.jsonl
          <span className={styles.aux}>{task.flowRun}</span>
        </h2>
        {task.trace.length ? <pre className={styles.trace}>{task.trace.join('\n')}</pre> : <p className={styles.muted}>No trace is held for this task</p>}
      </section>
    </div>
  );
}
