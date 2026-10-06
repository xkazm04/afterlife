'use client';

import type { Part } from '../../model/words';
import { Parts } from './Parts';
import { TierLetter } from './TierLetter';
import styles from './readout.module.css';

/** The HUD readout at the top centre: whatever the pointer or the focus is on, in large type, with its tier letters. */
export function Readout({ name, line, tiers }: { name: string | null; line: readonly Part[]; tiers: readonly (string | null)[] | null }) {
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
            <TierLetter key={i} tier={t} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
