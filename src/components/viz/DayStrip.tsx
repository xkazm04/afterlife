import { dayCells } from './model/cells';
import styles from './DayStrip.module.css';

/**
 * The clean-days strip (14 cells by default). `clean: null` means no record: a dashed empty box, not a zero.
 * `revertedToday` paints the newest cell red when no day is clean.
 */
export function DayStrip({ clean, days = 14, revertedToday }: { clean: number | null; days?: number; revertedToday?: boolean }) {
  if (clean == null) return <span className={`${styles.strip} ${styles.unk}`} title="no record · not scored" />;
  return (
    <span className={styles.strip} title={`${clean} of the last ${days} days clean`}>
      {dayCells(clean, days, revertedToday).map((c, i) => (
        <i key={i} className={c === 'clean' ? styles.f : c === 'fail' ? styles.x : undefined} />
      ))}
    </span>
  );
}
