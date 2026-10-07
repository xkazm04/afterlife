import type { Phase } from '../../model/flow/credit';
import type { Gap } from '../../model/ctx';
import { cx } from '../cx';
import styles from './gaps.module.css';

/** Where a gap is: picked (waits for you), or, once sent, opened → merged → ran → no lift or credited. */
export function GapState({ picked, phase, mr }: { gap?: Gap; picked: boolean; phase: Phase | undefined; mr: string }) {
  if (!phase) return picked ? <span className={cx(styles.st, styles.picked)}>● picked</span> : <span className={styles.none}>—</span>;
  switch (phase) {
    case 'probed':
      return <span className={styles.st}>probed · read only</span>;
    case 'opened':
      return <span className={cx(styles.st, styles.open)}>{mr} opened</span>;
    case 'merged':
      return <span className={cx(styles.st, styles.merged)}>{mr} merged</span>;
    case 'ran':
      return <span className={cx(styles.st, styles.merged)}>{mr} ran on main</span>;
    case 'nolift':
      return (
        <span className={cx(styles.st, styles.nolift)} title="configured, not exercised">
          ✗ {mr} no lift
        </span>
      );
    case 'credited':
      return <span className={cx(styles.st, styles.credited)}>✓ {mr} credited</span>;
  }
}
