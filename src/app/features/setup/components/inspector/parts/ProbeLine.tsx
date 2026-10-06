import { Spinner } from '../../shared/Spinner';
import type { ProbeNote } from '../../../model/types';
import styles from '../inspector.module.css';

/** The last probe of a step or a track: when, whether it passed, what it saw. A probe in flight shows a spinner. */
export function ProbeLine({ probe, busy, what }: { probe: ProbeNote | null; busy: boolean; what: string }) {
  return (
    <div className={styles.probe}>
      {busy ? (
        <>
          <Spinner />
          <span>probing {what}…</span>
        </>
      ) : probe ? (
        <>
          <span className={styles.pt}>{probe.at}</span>
          <span className={probe.ok ? styles.ok : styles.no}>{probe.ok ? '✓' : '…'}</span>
          <span>{probe.text}</span>
        </>
      ) : (
        <span className={styles.no}>not probed · unknown</span>
      )}
    </div>
  );
}
