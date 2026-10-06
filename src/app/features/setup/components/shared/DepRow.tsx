import type { ReactNode } from 'react';
import styles from './DepRow.module.css';

export type DepTone = 'none' | 'met' | 'you' | 'unknown' | 'no' | 'ready';

/** A clickable dependency line in the inspector: a ringed glyph, a label, a right-hand state word. */
export function DepRow({ tone = 'none', glyph, label, state, onGo }: { tone?: DepTone; glyph: ReactNode; label: ReactNode; state: string; onGo: () => void }) {
  return (
    <button type="button" className={`${styles.dep} ${styles[tone] ?? ''}`} onClick={onGo}>
      <span className={styles.gl}>{glyph}</span>
      <span className={styles.lb}>{label}</span>
      <span className={styles.s}>{state}</span>
    </button>
  );
}
