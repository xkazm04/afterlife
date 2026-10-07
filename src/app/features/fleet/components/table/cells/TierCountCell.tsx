import type { MouseEvent } from 'react';
import { Cell } from '@/components/table/Cell';
import { TierMark } from '@/components/status/TierMark';
import type { TierKey } from '@/lib/demo/types';
import { STANDING_META, type Standing } from '@/lib/tiers';
import type { ColumnRole } from '../../../model/list/sorting';
import styles from './cells.module.css';

const MAX_PIPS = 8;

export const roleClass = (role: ColumnRole) => (role === 'ranked' ? styles.rk : role === 'dim' ? styles.dimcol : '');

/**
 * One tier column of a project row: the count and one pip per class (up to 8). A project whose tiers are unknown
 * (no class tier rows; tiersKnown) has an empty cell, never a 0. Hovering a count asks for the popover that lists the
 * classes at that tier. The Quarantined cell also shows, set apart and never in its count, the classes the gate grants
 * nothing without a quarantine (`apart`: no record yet, blocked).
 */
export function TierCountCell({
  tier,
  count,
  known,
  apart = [],
  role,
  narrow,
  onEnter,
  onLeave,
}: {
  tier: TierKey;
  count: number;
  known: boolean;
  apart?: readonly (readonly [Standing, number])[];
  role: ColumnRole;
  narrow: boolean;
  onEnter: (e: MouseEvent<HTMLElement>) => void;
  onLeave: () => void;
}) {
  const cls = `${styles.tc} ${roleClass(role)}`;
  if (!known) return <Cell data data-tier={tier} className={cls} title="unknown" />;
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
      {apart.map(([s, n]) => (
        <span key={s} className={styles.apart} title={`${n} ${n === 1 ? 'class' : 'classes'}: ${STANDING_META[s].name.toLowerCase()} (not quarantined)`}>
          <TierMark tier={s} />
          {n}
        </span>
      ))}
    </Cell>
  );
}
