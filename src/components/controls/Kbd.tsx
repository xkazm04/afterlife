import type { ReactNode } from 'react';
import styles from './Kbd.module.css';

/** A keycap, e.g. <Kbd>⌘I</Kbd>. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}
