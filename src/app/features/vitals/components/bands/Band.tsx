import type { ReactNode } from 'react';
import { Unread } from '@/components/shell/host';
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

/**
 * A band whose slice is not read yet (`reason` absent: a dash where its summary and rows go) or could not be read
 * (`reason`: why). Never its empty state: an unread band is unknown, not empty.
 */
export function BandPending({ id, title, reason }: { id: string; title: string; reason?: string }) {
  return (
    <Band id={id} title={title} aux={reason ? 'not read' : <Unread label={`${title} not read yet`} />}>
      <p className={styles.bandEmpty} role="status" aria-busy={reason ? undefined : true}>
        {reason ? `Could not be read: ${reason}` : <Unread label={`${title} not read yet`} />}
      </p>
    </Band>
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
