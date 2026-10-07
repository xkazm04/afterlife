import { STANDING_META } from '@/lib/tiers';
import styles from './tier.module.css';

const LETTER: Record<string, string> = {
  hands_off: 'H', supervised: 'S', assisted: 'A', quarantined: 'Q', human_only: 'P',
  no_record: STANDING_META.no_record.letter, refused: STANDING_META.refused.letter,
};
const NAME: Record<string, string | undefined> = { no_record: STANDING_META.no_record.name, refused: STANDING_META.refused.name };
const CLS: Record<string, string | undefined> = {
  hands_off: styles.handsOff,
  supervised: styles.supervised,
  assisted: styles.assisted,
  quarantined: styles.quarantined,
  human_only: styles.human,
  no_record: styles.noRecord,
  refused: styles.refused,
};

/**
 * A tier as its letter in its colour (never colour alone); a dashed "?" when the class is unknown. A class the gate grants
 * nothing is not a Q: a dashed "–" for no record yet, an outlined "!" for blocked.
 */
export function TierLetter({ tier, title }: { tier: string | null; title?: string }) {
  return (
    <i className={`${styles.tl} ${tier ? (CLS[tier] ?? '') : styles.null}`} title={title ?? (tier ? NAME[tier] : undefined)}>
      {tier ? LETTER[tier] : '?'}
    </i>
  );
}
