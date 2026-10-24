import { clampRung } from './model/cells';
import styles from './StageMeter.module.css';

/**
 * One stage as four rising bars (rung 0..4); null is a dashed "?" box. `showNumber` adds the rung digit. `deep` draws
 * the lit bars green (the stage has real evidence, R3 and above) instead of cyan. The rung is clamped and rounded to
 * 0..4 as StageTicks draws it (clampRung).
 */
export function StageMeter({ rung: raw, showNumber, deep }: { rung: number | null; showNumber?: boolean; deep?: boolean }) {
  if (raw == null) {
    return (
      <span className={styles.qbox} role="img" aria-label="Rung unknown" title="Rung unknown">
        ?
      </span>
    );
  }
  const rung = clampRung(raw);
  return (
    <span className={deep ? `${styles.meter} ${styles.deep}` : styles.meter} role="img" aria-label={`Rung ${rung} of 4`} title={`rung ${rung} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= rung ? styles.on : undefined} />
      ))}
      {showNumber ? <span className={styles.rn}>{rung}</span> : null}
    </span>
  );
}
