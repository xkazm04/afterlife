import type { ReactNode } from 'react';
import styles from './Chip.module.css';

/**
 * A small neutral label: plain, or "invariant" (dimmer, for a check no claim asked for).
 * Dashed and seeded labels are the shared HonestyChip.
 */
// kit-candidate: the prototype's .chp (neutral chip). Promote next to status/HonestyChip.
export function Chip({ children, title, tone = 'plain' }: { children: ReactNode; title?: string; tone?: 'plain' | 'invariant' }) {
  return (
    <span className={`${styles.chip} ${tone === 'invariant' ? styles.inv : ''}`} title={title}>
      {children}
    </span>
  );
}
