import styles from './StageMeter.module.css';

/** One stage as four rising bars (rung 0..4); null is a dashed "?" box. `showNumber` adds the rung digit. */
export function StageMeter({ rung, showNumber }: { rung: number | null; showNumber?: boolean }) {
  if (rung == null) {
    return (
      <span className={styles.qbox} title="unknown">
        ?
      </span>
    );
  }
  return (
    <span className={styles.meter} title={`rung ${rung} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= rung ? styles.on : undefined} />
      ))}
      {showNumber ? <span className={styles.rn}>{rung}</span> : null}
    </span>
  );
}
