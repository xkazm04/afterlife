import { Chip } from '@/components/status/chip/Chip';
import type { ClassRow } from '../../model/types';
import styles from './ladderTable.module.css';

/** The last move, with "tripwire" picked out, and the pending chip while a commit waits for the tier-gate read. */
export function LastMoveCell({ cls }: { cls: ClassRow }) {
  const parts = cls.lastMove.split('tripwire');
  return (
    <>
      <span className={styles.mv} title={cls.lastMove}>
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 ? <span className={styles.trip}>tripwire</span> : null}
            {p}
          </span>
        ))}
      </span>
      {cls.pending ? (
        <span className={styles.pend}>
          <Chip compact tone="pending" title={`commit ${cls.pending} pushed · the next MR pipeline reads it`}>
            {cls.pending} · pending
          </Chip>
        </span>
      ) : null}
    </>
  );
}
