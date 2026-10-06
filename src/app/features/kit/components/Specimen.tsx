import type { ReactNode } from 'react';
import styles from './GallerySection.module.css';

/** One labelled example: a small caption (the state or props shown) and the component in that state. */
export function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.spec}>
      <div className={styles.lab}>{label}</div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
