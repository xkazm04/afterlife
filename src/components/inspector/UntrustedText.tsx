import type { ReactNode } from 'react';
import { revealControls } from './blocks/reveal';
import styles from './UntrustedText.module.css';

/**
 * Agent-authored or externally sourced prose. Drawn mono with a dashed left rule and rendered as text, never HTML.
 * A string child has its bidi controls and invisible characters drawn as visible code points (see blocks/reveal).
 */
export function UntrustedText({ children, source: raw }: { children: ReactNode; source?: string }) {
  const source = raw === undefined ? undefined : revealControls(raw);
  return (
    <blockquote
      className={styles.untrusted}
      aria-label={source ? `Untrusted text from ${source}` : 'Untrusted text'}
      title={source ? `Untrusted: ${source}` : 'Untrusted text'}>
      {typeof children === 'string' ? revealControls(children) : children}
    </blockquote>
  );
}
