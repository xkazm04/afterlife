import { cellLetter, cellName, isCeiling, isStanding, type ClassCell, type Holder } from '@/lib/tiers';
import styles from './tier.module.css';

const CLS: Record<string, string | undefined> = {
  hands_off: styles.handsOff,
  supervised: styles.supervised,
  assisted: styles.assisted,
  quarantined: styles.quarantined,
  human_only: styles.human,
  no_record: styles.noRecord,
  refused: styles.refused,
};

const cellOf = (t: string | null): ClassCell => (isCeiling(t) || t === 'no_record' || t === 'refused' ? t : null);

/**
 * A tier as its letter in its colour (never colour alone); a dashed "?" when the class is unknown. No record yet is not a
 * Q: a dashed "–". A class several agents hold shows its most restrictive holder's letter then "÷", every holder in the
 * title ("÷" alone when the holders are not known).
 */
export function TierLetter({ tier, holders, title }: { tier: string | null; holders?: readonly Holder[]; title?: string }) {
  const c = cellOf(tier);
  return (
    <i className={`${styles.tl} ${c ? (CLS[c] ?? '') : styles.null}`} title={title ?? (c && (isStanding(c) || holders) ? cellName(c, holders) : undefined)}>
      {cellLetter(c, holders)}
    </i>
  );
}
