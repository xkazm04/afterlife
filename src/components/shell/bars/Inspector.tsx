import type { ReactNode } from 'react';
import styles from './Inspector.module.css';

/**
 * The inspector column (layer 2: the detail of whatever is selected). The Window renders this around the
 * `inspector` you pass it; build the content from InspectorHeader and InspectorSection. Closed means hidden,
 * not unmounted, so scroll position and open sections survive a toggle.
 */
export function Inspector({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <aside id="inspector" className={styles.insp} aria-label="Inspector" aria-hidden={!open} hidden={!open}>
      {children}
    </aside>
  );
}
