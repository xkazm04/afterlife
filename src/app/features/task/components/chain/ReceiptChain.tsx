import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { ObjectLink } from '@/components/controls/ObjectLink';
import type { TaskView } from '../../model/types';
import styles from './ReceiptChain.module.css';

/**
 * The receipt chain: Event, Route, Act, Prove, Decide, Deploy, Record. A link not reached (nothing shipped) is dashed n/a.
 * `lit` is the link the selected check's evidence comes from. A task the source holds no chain for says so: that is
 * unknown, not "nothing shipped".
 */
export function ReceiptChain({ task, lit }: { task: TaskView; lit: number }) {
  if (!task.chain.length) {
    return (
      <div className={styles.none} aria-label="Receipt chain">
        <HonestyChip kind="unknown" /> No receipt chain is held for this task
      </div>
    );
  }
  return (
    <ol className={styles.chain} aria-label="Receipt chain">
      {task.chain.map((l, i) => (
        <li key={l.step} className={`${styles.lk} ${l.na ? styles.na : ''} ${i === lit ? styles.lit : ''}`} aria-current={i === lit ? 'true' : undefined}>
          <div className={styles.s}>
            <span>
              {i + 1} {l.step}
            </span>
            <span className={styles.at}>{l.at ?? '—'}</span>
          </div>
          <div className={styles.o} title={l.obj ?? 'nothing shipped'}>
            {l.na ? 'nothing shipped' : l.obj}
          </div>
          <div className={styles.rf}>
            {l.na ? <HonestyChip kind="unknown">n/a</HonestyChip> : l.ref ? <ObjectLink target={l.ref} /> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
