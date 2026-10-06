import type { ReactNode } from 'react';
import styles from './Chip.module.css';

// kit-candidate: the prototype's .chp. HonestyChip covers the dashed honesty marks; the pending and lag variants and
// the plain outline are what the Ladder adds.
export type ChipTone = 'plain' | 'pending' | 'lag';

/** A small outlined chip. `pending`: a commit waits for the tier-gate read. `lag`: Belay noticed late. */
export function Chip({ tone = 'plain', title, children }: { tone?: ChipTone; title?: string; children: ReactNode }) {
  return (
    <span className={`${styles.chip} ${tone === 'plain' ? '' : styles[tone]}`} title={title}>
      {children}
    </span>
  );
}
