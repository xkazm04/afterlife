import type { Ceiling } from '@/schemas';
import { TIER_META } from '@/lib/tiers';
import styles from './TierMark.module.css';

/**
 * The letter mark for a tier (H S A Q P). Quarantined is filled, Human only is outlined, the rest are tinted.
 * `stale` fades it (last known); a stale table row also does so through its data-stale attribute.
 */
export function TierMark({ tier, stale }: { tier: Ceiling | null | undefined; stale?: boolean }) {
  if (!tier) return null;
  const meta = TIER_META[tier];
  return (
    <span className={styles.mk} data-tier={tier} data-stale={stale ? 'true' : undefined} title={meta.name}>
      {meta.letter}
    </span>
  );
}
