'use client';

import type { ReactNode } from 'react';
import styles from './StaleRegion.module.css';

/** "14:02:11": the read's time on this machine's clock, to the second. */
export const asOfClock = (iso: string): string => new Date(iso).toLocaleTimeString('en-GB', { hour12: false });

/**
 * One region of Needs you while its rows are the last visit's: Needs you re-reads on every visit, and until the fresh
 * read lands the region says when its rows are from and cannot be acted on (inert). `asOf` null: fresh, drawn as is.
 * Amber is never shown as fresh when it is not.
 */
export function StaleRegion({ asOf, label, className, children }: { asOf: string | null; label: string; className?: string; children: ReactNode }) {
  const stale = asOf !== null;
  return (
    <div className={className ? `${styles.region} ${className}` : styles.region} inert={stale} aria-busy={stale || undefined}>
      {stale ? (
        <span className={styles.note} role="status" aria-label={`${label} as of ${asOfClock(asOf)}, re-reading`}>
          as of {asOfClock(asOf)} · re-reading
        </span>
      ) : null}
      {children}
    </div>
  );
}
