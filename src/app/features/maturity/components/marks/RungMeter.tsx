// kit-candidate: RungMeter - the shared StageMeter plus a `deep` prop (R3 and above drawn green, as on the crag).
import { cx } from '../cx';
import styles from './RungMeter.module.css';

/** Four rising bars for a stage's rung; bars at R3 and above are green. Unknown is a dashed "?" box, never empty. */
export function RungMeter({ rung }: { rung: number | null }) {
  if (rung == null) {
    return (
      <span className={styles.qbox} title="unknown">
        ?
      </span>
    );
  }
  return (
    <span className={cx(styles.meter, rung >= 3 && styles.deep)} title={`rung ${rung} of 4`}>
      {[1, 2, 3, 4].map((r) => (
        <i key={r} className={r <= rung ? styles.on : undefined} />
      ))}
    </span>
  );
}
