import type { ReactNode } from 'react';
import styles from './PaneScroll.module.css';

/**
 * A scrolling content pane for screens that are not a table (Settings, the kit gallery, forms). Fills the Window's
 * pane. `padded` adds the standard 12 x 16 padding.
 */
export function PaneScroll({ padded = true, children }: { padded?: boolean; children: ReactNode }) {
  return <div className={`${styles.scroll} ${padded ? styles.pad : ''}`}>{children}</div>;
}
