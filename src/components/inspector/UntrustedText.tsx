import type { ReactNode } from 'react';
import styles from './UntrustedText.module.css';

/** Agent-authored or externally sourced prose. Drawn mono with a dashed left rule and rendered as text, never HTML. */
export function UntrustedText({ children, source }: { children: ReactNode; source?: string }) {
  return (
    <blockquote className={styles.untrusted} title={source ? `Untrusted: ${source}` : 'Untrusted text'}>
      {children}
    </blockquote>
  );
}
