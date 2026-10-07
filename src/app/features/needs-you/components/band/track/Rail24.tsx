import { elapsedPercent, railTicks } from '../../../model/clock/clock';
import styles from './Rail24.module.css';

const KIND = { start: styles.start, mid: styles.mid, center: styles.center, end: styles.end } as const;

/** The 24 h rail: hatched amber for the time already used, "now" at its edge, ticks at the start, +6/12/18 h and the due time. */
export function Rail24({ totalSec, leftSec, awareAt, dueClock, signed }: { totalSec: number; leftSec: number; awareAt: string; dueClock: string; signed: boolean }) {
  const pct = `${elapsedPercent(totalSec, leftSec)}%`;
  return (
    <div className={`${styles.tl} ${signed ? styles.signed : ''}`} aria-hidden="true">
      <div className={styles.rail}>
        <i className={styles.fill} style={{ width: pct }} />
      </div>
      <span className={styles.now} style={{ left: pct }}>
        <b>now</b>
      </span>
      {railTicks(totalSec, awareAt, dueClock).map((t) => (
        <span key={t.label} className={`${styles.tk} ${KIND[t.kind]}`} style={{ left: `${t.pct}%` }}>
          {t.label}
        </span>
      ))}
    </div>
  );
}
