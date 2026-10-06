import type { ReactNode } from 'react';
import styles from './Chip.module.css';

export type ChipTone =
  | 'plain' // a neutral outline
  | 'invariant' // dimmer outline: an engine invariant no claim asked for
  | 'neutral' // a filled neutral: "no lift", "below"
  | 'ok' // holds, credited, deep
  | 'bad' // fails
  | 'accent' // cyan
  | 'pending' // a commit waits for the tier-gate read (cyan)
  | 'lag' // Belay noticed late (amber, stale)
  | 'you' // solid amber: only a person can
  | 'unknown'; // dashed: never zero, never absent

/**
 * A small status chip. `tone` picks the colour; `compact` is the 16 px table-cell size (default 18 px);
 * `push` moves it to the right edge of a flex row. The dashed honesty marks (seeded, simulated, stale) are
 * HonestyChip, not a tone of this.
 */
export function Chip({
  tone = 'plain',
  compact,
  push,
  title,
  children,
}: {
  tone?: ChipTone;
  compact?: boolean;
  push?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const cls = [styles.chip, styles[tone], compact ? styles.compact : '', push ? styles.push : ''].filter(Boolean).join(' ');
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}
