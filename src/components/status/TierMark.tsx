import { holdersText, isStanding, splitTier, STANDING_META, TIER_META, type ClassCell, type Holder } from '@/lib/tiers';
import styles from './TierMark.module.css';

/**
 * The letter mark for a tier (H S A Q P). Quarantined is filled, Human only is outlined, the rest are tinted. A class the
 * gate grants no tier is drawn apart from a quarantine: "–" dashed for no record yet. A class several agents hold shows
 * its most restrictive holder's letter with a split mark, every holder named in its title ("÷" when they are not known).
 * `stale` fades it (last known); a stale table row also does so through its data-stale attribute.
 */
export function TierMark({ tier, holders, stale }: { tier: ClassCell | undefined; holders?: readonly Holder[]; stale?: boolean }) {
  if (!tier) return null;
  if (tier === 'refused' && holders?.length) {
    const low = splitTier(holders);
    return (
      <span className={styles.mk} data-tier={low} data-split="true" data-stale={stale ? 'true' : undefined} title={`${STANDING_META.refused.name}: ${holdersText(holders)}`}>
        {TIER_META[low].letter}
        <span className={styles.split} aria-hidden>
          {STANDING_META.refused.letter}
        </span>
      </span>
    );
  }
  const meta = isStanding(tier) ? STANDING_META[tier] : TIER_META[tier];
  return (
    <span className={styles.mk} data-tier={tier} data-stale={stale ? 'true' : undefined} title={meta.name}>
      {meta.letter}
    </span>
  );
}
