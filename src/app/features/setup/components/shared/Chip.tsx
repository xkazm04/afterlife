import type { ReactNode } from 'react';
import styles from './Chip.module.css';

export type ChipTone = 'plain' | 'ok' | 'accent' | 'fail' | 'you' | 'unknown';

// kit-candidate: Chip (notes/setup.md lists .chip)
/** A small status chip in the inspector header: ok green, accent cyan, you amber (filled), unknown dashed. */
export function Chip({ tone = 'plain', children }: { tone?: ChipTone; children: ReactNode }) {
  return <span className={`${styles.chip} ${styles[tone] ?? ''}`}>{children}</span>;
}
