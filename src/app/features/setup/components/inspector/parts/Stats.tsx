import styles from './Stats.module.css';

export type StatTone = 'ok' | 'accent' | 'you' | 'plain';

// kit-candidate: Stats (the .prf count row: a big number over a small word)
/** A row of big-number stats: armed, ready, locked, need you. */
export function Stats({ cells }: { cells: readonly { n: number; label: string; tone: StatTone }[] }) {
  return (
    <div className={styles.prf}>
      {cells.map((c) => (
        <div key={c.label} className={`${styles.cell} ${styles[c.tone] ?? ''}`}>
          <b>{c.n}</b>
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
