import styles from './Stats.module.css';

export type StatTone = 'ok' | 'accent' | 'you' | 'plain';

/** A row of big-number stats: a number over a small word, the number in a tone colour ("armed 3", "need you 2"). */
export function Stats({ cells }: { cells: readonly { n: number; label: string; tone?: StatTone }[] }) {
  return (
    <div className={styles.prf}>
      {cells.map((c) => (
        <div key={c.label} className={`${styles.cell} ${styles[c.tone ?? 'plain'] ?? ''}`}>
          <b>{c.n}</b>
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
