// kit-candidate: GapBadge - NeedsYouBadge with a text label instead of a count (here: a picked gap's id).
import type { ReactNode } from 'react';
import styles from './GapBadge.module.css';

/** A picked gap that waits for you: the loud amber, outlined. `solid` fills it (a count). */
export function GapBadge({ children, solid, title }: { children: ReactNode; solid?: boolean; title?: string }) {
  return (
    <span className={solid ? `${styles.badge} ${styles.solid}` : styles.badge} title={title ?? 'gap picked, waits for you'}>
      {children}
    </span>
  );
}
