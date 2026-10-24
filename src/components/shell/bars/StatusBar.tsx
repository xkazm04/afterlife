'use client';

import type { ReactNode } from 'react';
import { useStatusMessage } from '@/components/overlays/toast/useToast';
import { useShellInfo } from '../ShellContext';
import { dataLabel } from './dataLabel';
import { PollStatus } from './poll/PollStatus';
import styles from './StatusBar.module.css';

/**
 * The status bar: your `children` on the left, the transient status message (from useToast().status) after it,
 * then, live, the poll line (poll/PollStatus: the last good poll's age, a failure and Re-poll), the data label (dataLabel:
 * "illustrative demo data" in demo, what is live in live mode) and `help` (the HelpButton) on the right.
 */
export function StatusBar({ children, help }: { children?: ReactNode; help?: ReactNode }) {
  const message = useStatusMessage();
  const { data } = useShellInfo();
  return (
    <footer className={styles.sbar}>
      <span data-xray="status">{children}</span>
      <span className={styles.msg} aria-live="polite">
        {message ? `· ${message}` : ''}
      </span>
      {data?.poll && <PollStatus poll={data.poll} />}
      <span className={styles.demo} data-xray="data-label">{dataLabel(data)}</span>
      {help}
    </footer>
  );
}
