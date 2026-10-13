import type { ReactNode } from 'react';
import styles from './GallerySection.module.css';

/** A titled group of specimens in the kit gallery. */
export function GallerySection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.h}>
        {title}
        {note ? <span className={styles.note}>{note}</span> : null}
      </h2>
      <div className={styles.grid}>{children}</div>
    </section>
  );
}
