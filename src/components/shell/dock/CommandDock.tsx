import type { ReactNode } from 'react';
import styles from './dock.module.css';

/**
 * A command strip docked at the bottom of a (`position: relative`) pane: the exact line the next key will run, in mono,
 * and on the right the keys. It is a live region. Put `<b>` around the subject, `DockPrompt` around the key and
 * `DockNote` around the aside; `DockKey` for each hint on the right. Keep it to one line; it truncates.
 */
export function CommandDock({ line, title, children }: { line: ReactNode; title?: string; children?: ReactNode }) {
  return (
    <div className={styles.dock} aria-live="polite" title={title}>
      <span className={styles.ln}>{line}</span>
      {children ? <span className={styles.keys}>{children}</span> : null}
    </div>
  );
}
