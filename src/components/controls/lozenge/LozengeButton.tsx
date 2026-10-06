import type { ReactNode } from 'react';
import styles from './Lozenge.module.css';

/**
 * One lozenge cell: an optional lead glyph (any node: a StateGlyph, a TierMark, a NeedsYouBadge), a bold count and a
 * word. The word hides on narrow windows. `pressed` toggles it as a filter.
 */
export function LozengeButton({
  lead,
  count,
  word,
  pressed,
  title,
  onClick,
}: {
  lead?: ReactNode;
  count?: ReactNode;
  word?: string;
  pressed?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={styles.btn} aria-pressed={pressed} title={title} onClick={onClick}>
      {lead}
      {count != null ? <span className={styles.num}>{count}</span> : null}
      {word ? <span className={styles.wd}>{word}</span> : null}
    </button>
  );
}
