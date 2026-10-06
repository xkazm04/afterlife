import type { ReactNode } from 'react';
import type { Ceiling } from '@/schemas';
import { TIER_META } from '@/lib/tiers';
import styles from './TierChip.module.css';

/** A tier as a chip: letter mark plus name (or `children`). Never colour alone. */
export function TierChip({ tier, children }: { tier: Ceiling; children?: ReactNode }) {
  const meta = TIER_META[tier];
  return (
    <span className={styles.tier} data-tier={tier}>
      <span className={styles.mk}>{meta.letter}</span>
      {children ?? meta.name}
    </span>
  );
}
