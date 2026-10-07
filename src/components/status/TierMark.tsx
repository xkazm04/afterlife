import { isStanding, STANDING_META, TIER_META, type ClassCell } from '@/lib/tiers';
import styles from './TierMark.module.css';

/**
 * The letter mark for a tier (H S A Q P). Quarantined is filled, Human only is outlined, the rest are tinted. A class the
 * gate grants no tier is drawn apart from a quarantine: "–" dashed for no record yet, "!" outlined for blocked.
 * `stale` fades it (last known); a stale table row also does so through its data-stale attribute.
 */
export function TierMark({ tier, stale }: { tier: ClassCell | undefined; stale?: boolean }) {
  if (!tier) return null;
  const meta = isStanding(tier) ? STANDING_META[tier] : TIER_META[tier];
  return (
    <span className={styles.mk} data-tier={tier} data-stale={stale ? 'true' : undefined} title={meta.name}>
      {meta.letter}
    </span>
  );
}
