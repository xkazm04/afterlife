import { dayCells } from './model/cells';
import styles from './DayStrip.module.css';

/**
 * The clean-days strip (14 cells by default). `clean: null` means no record: a dashed empty box, not a zero.
 * `revertedToday` paints the newest cell red when no day is clean. A run longer than the window fills every cell and
 * keeps its full length in the name.
 */
export function DayStrip({ clean, days = 14, revertedToday }: { clean: number | null; days?: number; revertedToday?: boolean }) {
  if (clean == null) return <span className={`${styles.strip} ${styles.unk}`} role="img" aria-label="No record, not scored" title="no record · not scored" />;
  const shown = Math.max(0, Math.min(days, clean));
  const name = `${shown} of the last ${days} days clean${clean > days ? ` (${clean} in a row)` : ''}`;
  return (
    <span className={styles.strip} role="img" aria-label={name} title={name}>
      {dayCells(clean, days, revertedToday).map((c, i) => (
        <i key={i} className={c === 'clean' ? styles.f : c === 'fail' ? styles.x : undefined} />
      ))}
    </span>
  );
}
