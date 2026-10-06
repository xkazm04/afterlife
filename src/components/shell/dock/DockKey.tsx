import type { ReactNode } from 'react';
import styles from './dock.module.css';

/** One key hint on the right of a CommandDock. `optional` hints go first when the strip is narrower than 820 px. */
export function DockKey({ optional, children }: { optional?: boolean; children: ReactNode }) {
  return <span className={optional ? `${styles.key} ${styles.opt}` : styles.key}>{children}</span>;
}
