import type { ReactNode } from 'react';
import styles from './Sidebar.module.css';

/** A titled group in the sidebar ("Groups", "Smart filters"): a small dim heading and its SidebarItems. */
export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.h3}>{title}</h3>
      {children}
    </section>
  );
}
