import type { ReactNode } from 'react';
import styles from './Sidebar.module.css';

/**
 * A titled group in the sidebar ("Groups", "Smart filters"): a small dim heading and its SidebarItems. `aux` is a dim
 * note right-aligned on the heading's line (a "2 / 7" count).
 */
export function SidebarSection({ title, aux, children }: { title: string; aux?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.h3}>
        {title}
        {aux ? <span className={styles.aux}>{aux}</span> : null}
      </h3>
      {children}
    </section>
  );
}
