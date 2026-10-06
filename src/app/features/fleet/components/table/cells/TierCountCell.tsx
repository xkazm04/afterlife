import type { MouseEvent } from 'react';
import { Cell } from '@/components/table/Cell';
import type { TierKey } from '@/lib/demo/types';
import type { ColumnRole } from '../../../model/list/sorting';
import styles from './cells.module.css';

const MAX_PIPS = 8;

export const roleClass = (role: ColumnRole) => (role === 'ranked' ? styles.rk : role === 'dim' ? styles.dimcol : '');

/**
 * One tier column of a project row: the count and one pip per class (up to 8). An unarmed project has an empty
 * cell. Hovering a count asks for the popover that lists the classes at that tier.
 */
export function TierCountCell({
  tier,
  count,
  armed,
  role,
  narrow,
  onEnter,
  onLeave,
}: {
  tier: TierKey;
  count: number;
  armed: boolean;
  role: ColumnRole;
  narrow: boolean;
  onEnter: (e: MouseEvent<HTMLElement>) => void;
  onLeave: () => void;
}) {
  const cls = `${styles.tc} ${roleClass(role)}`;
  if (!armed) return <Cell data data-tier={tier} className={cls} />;
  return (
    <Cell data data-tier={tier} className={cls} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <span className={styles.n}>{count}</span>
      {count && !narrow ? (
        <span className={styles.pips}>
          {Array.from({ length: Math.min(count, MAX_PIPS) }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      ) : null}
    </Cell>
  );
}
