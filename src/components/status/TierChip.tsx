import type { ReactNode } from 'react';
import type { Ceiling } from '@/schemas';
import { TIER_META } from '@/lib/tiers';
import styles from './TierChip.module.css';

/**
 * A tier as a chip: letter mark plus name (or `children`). Never colour alone. Beside the name the letter is decoration,
 * hidden from assistive tech; beside `children` it is the only tier signal, so it speaks the tier's name.
 */
export function TierChip({ tier, children }: { tier: Ceiling; children?: ReactNode }) {
  const meta = TIER_META[tier];
  const own = children === undefined || children === null;
  return (
    <span className={styles.tier} data-tier={tier}>
      <span className={styles.mk} {...(own ? { 'aria-hidden': true } : { role: 'img', 'aria-label': meta.name })}>
        {meta.letter}
      </span>
      {own ? meta.name : children}
    </span>
  );
}
