import { Cell } from '@/components/table/Cell';
import type { TierKey } from '@/lib/demo/types';
import type { ColumnRole } from '../../../model/list/sorting';
import styles from './cells.module.css';
import { roleClass } from './TierCountCell';

/** A group row's total for one tier; empty (unknown, not 0) when no project in it has known tiers. */
export function TierTotalCell({ tier, total, role }: { tier: TierKey; total: number | null; role: ColumnRole }) {
  return (
    <Cell data-tier={tier} className={`${styles.tc} ${styles.total} ${roleClass(role)}`} title={total === null ? 'unknown' : undefined}>
      {total === null ? null : <span className={styles.n}>{total}</span>}
    </Cell>
  );
}
