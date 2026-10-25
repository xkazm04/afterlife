import type { ReactNode } from 'react';
import styles from '../../vitals.module.css';

/** One of the three bands: a heading with its dim summary, then its table or its empty state. */
export function Band({ id, title, aux, children }: { id: string; title: string; aux?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.band} aria-labelledby={`vitals-${id}`} data-band={id}>
      <h2 id={`vitals-${id}`} className={styles.bandHead}>
        {title}
        {aux ? <span className={styles.aux}>{aux}</span> : null}
      </h2>
      {children}
    </section>
  );
}

/** A band with nothing to draw: what is missing, and the one thing that fills it. */
export function BandEmpty({ children }: { children: ReactNode }) {
  return (
    <p className={styles.bandEmpty} role="status">
      {children}
    </p>
  );
}
