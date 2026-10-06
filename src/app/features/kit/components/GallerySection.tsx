import type { ReactNode } from 'react';
import styles from './GallerySection.module.css';

/** A titled group of specimens in the kit gallery. */
export function GallerySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.h}>{title}</h2>
      <div className={styles.grid}>{children}</div>
    </section>
  );
}
