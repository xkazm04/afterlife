import type { ReactNode } from 'react';
import styles from './marks.module.css';

// kit-candidate: Chip with plain / ok / accent tones (HonestyChip covers seeded, simulated, unknown and stale).
export function Chip({ tone = 'plain', title, children }: { tone?: 'plain' | 'ok' | 'accent'; title?: string; children: ReactNode }) {
  const cls = [styles.chip, tone === 'ok' ? styles.ok : '', tone === 'accent' ? styles.accent : ''].filter(Boolean).join(' ');
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}
