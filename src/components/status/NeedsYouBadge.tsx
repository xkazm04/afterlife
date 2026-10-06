import type { ReactNode } from 'react';
import styles from './status.module.css';

export type NeedsYouVariant = 'live' | 'last-known' | 'group';

/**
 * The one loud element: how many decisions wait for a person. `live` is solid amber, `last-known` (stale feed)
 * and `group` (a group's sum) are outlined. Renders nothing for a zero count unless `showZero`.
 * `label` shows text instead of the count (a picked gap's id) and is always drawn; give it a `title`.
 */
export function NeedsYouBadge({
  count = 0,
  label,
  variant = 'live',
  small,
  showZero,
  title,
}: {
  count?: number;
  label?: ReactNode;
  variant?: NeedsYouVariant;
  small?: boolean;
  showZero?: boolean;
  title?: string;
}) {
  if (label === undefined && !count && !showZero) return null;
  const tip = title ?? (variant === 'last-known' ? `${count} waiting, last known` : `${count} waiting for you`);
  return (
    <span className={`${styles.ny} ${variant !== 'live' ? styles.outline : ''} ${small ? styles.small : ''}`} title={tip}>
      {label ?? count}
    </span>
  );
}
