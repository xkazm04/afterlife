'use client';

import type { ReactNode } from 'react';
import { useStatusMessage } from '@/components/overlays/toast/useToast';
import styles from './StatusBar.module.css';

/**
 * The status bar: your `children` on the left, the transient status message (from useToast().status) after it,
 * then "illustrative demo data" and `help` (the HelpButton) on the right.
 */
export function StatusBar({ children, help }: { children?: ReactNode; help?: ReactNode }) {
  const message = useStatusMessage();
  return (
    <footer className={styles.sbar}>
      <span>{children}</span>
      <span className={styles.msg} aria-live="polite">
        {message ? `· ${message}` : ''}
      </span>
      <span className={styles.demo}>illustrative demo data</span>
      {help}
    </footer>
  );
}
