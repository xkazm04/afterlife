'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import styles from './InspectorSection.module.css';

/**
 * A collapsible inspector section (native <details>). `aux` is the dim right-aligned summary text or a badge.
 * Uncontrolled by default (`defaultOpen`, true if omitted); pass `open` + `onOpenChange` to keep the state yourself.
 */
export function InspectorSection({
  title,
  aux,
  open,
  defaultOpen = true,
  onOpenChange,
  children,
}: {
  title: ReactNode;
  aux?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const controlled = open !== undefined;
  return (
    <details
      className={styles.details}
      open={controlled ? open : defaultOpen}
      onToggle={(e) => onOpenChange?.(e.currentTarget.open)}
    >
      <summary className={styles.summary}>
        <Icon name="disc" className={styles.disc} />
        <span>{title}</span>
        {aux != null && aux !== false ? <span className={styles.aux}>{aux}</span> : null}
      </summary>
      <div className={styles.sec}>{children}</div>
    </details>
  );
}
