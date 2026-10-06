import styles from './tier.module.css';

const LETTER: Record<string, string> = { hands_off: 'H', supervised: 'S', assisted: 'A', quarantined: 'Q', human_only: 'P' };
const CLS: Record<string, string | undefined> = {
  hands_off: styles.handsOff,
  supervised: styles.supervised,
  assisted: styles.assisted,
  quarantined: styles.quarantined,
  human_only: styles.human,
};

/** A tier as its letter in its colour (never colour alone); a dashed "?" when the class is unknown. */
export function TierLetter({ tier, title }: { tier: string | null; title?: string }) {
  return (
    <i className={`${styles.tl} ${tier ? (CLS[tier] ?? '') : styles.null}`} title={title}>
      {tier ? LETTER[tier] : '?'}
    </i>
  );
}
