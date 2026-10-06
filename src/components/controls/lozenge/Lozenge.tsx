import type { ReactNode } from 'react';
import styles from './Lozenge.module.css';

/**
 * The toolbar status lozenge: a row of count buttons (LozengeButton) split by LozengeDividers. It doubles as a
 * filter when the buttons are `pressed` toggles. Hidden below 900px of window width.
 */
export function Lozenge({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.lozenge} role="group" aria-label={label}>
      {children}
    </div>
  );
}
