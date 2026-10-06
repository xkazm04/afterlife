import type { ReactNode } from 'react';
import styles from './table.module.css';

/** Wraps a GroupRow and its rows. The group row sticks under the header only while its own rows scroll. */
export function RowGroup({ children }: { children: ReactNode }) {
  return (
    <section className={styles.grp} role="rowgroup">
      {children}
    </section>
  );
}
