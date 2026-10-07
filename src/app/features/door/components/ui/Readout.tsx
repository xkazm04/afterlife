'use client';

import type { Holder } from '@/lib/tiers';
import type { Part } from '../../model/words';
import { Parts } from './Parts';
import { TierLetter } from './TierLetter';
import styles from './readout.module.css';

/**
 * The HUD readout at the top centre: whatever the pointer or the focus is on, in large type, with its tier letters (a split
 * class with each holder's tier, `holders` by the same index as `tiers`).
 */
export function Readout({ name, line, tiers, holders }: { name: string | null; line: readonly Part[]; tiers: readonly (string | null)[] | null; holders?: readonly (readonly Holder[] | undefined)[] }) {
  return (
    <div className={`${styles.readout} ${styles.hud} ${name ? styles.on : ''}`} role="status" aria-live="polite" data-role="door-readout">
      <div className={styles.roName} data-role="door-readout-name">
        {name}
      </div>
      <div className={styles.roLine}>
        <Parts parts={line} />
      </div>
      {tiers ? (
        <div className={styles.roTiers}>
          {tiers.map((t, i) => (
            <TierLetter key={i} tier={t} holders={holders?.[i]} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
