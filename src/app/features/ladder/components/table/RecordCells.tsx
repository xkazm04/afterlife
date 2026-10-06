import { Cell } from '@/components/table/Cell';
import { DayStrip } from '@/components/viz/DayStrip';
import { pct } from '../../model/rules/promotion';
import type { ClassRow } from '../../model/types';
import styles from './ladderTable.module.css';

const NO_RECORD = 'no record · not scored';

/** Lease, Acc, No-edit, Rv and the 14-day strip. No record is a dim dash (never zero); Human only has no record. */
export function RecordCells({ cls, className }: { cls: ClassRow; className?: string }) {
  const r = cls.record;
  const none = r || cls.tier === 'human_only' ? null : (
    <span className={styles.z} title={NO_RECORD}>
      —
    </span>
  );
  const lease = cls.lease_days;
  return (
    <>
      <Cell align="end" className={className}>
        {lease ? <span title={`${lease} d left of 14, then Supervised unless a person re-confirms`}>{lease} d</span> : <span className={styles.z}>—</span>}
      </Cell>
      <Cell align="end" className={className}>
        {r ? (
          <>
            {r.accepted}
            {r.needed ? <span className={styles.dn}>/{r.needed}</span> : null}
          </>
        ) : (
          none
        )}
      </Cell>
      <Cell align="end" className={className}>
        {r ? <span className={r.noEdit < 0.9 ? styles.dn : undefined}>{pct(r.noEdit)}</span> : none}
      </Cell>
      <Cell align="center" className={className}>
        {r ? <span className={r.reverts ? styles.bad : styles.z}>{r.reverts}</span> : none}
      </Cell>
      <Cell className={className}>
        {r || cls.tier !== 'human_only' ? <DayStrip clean={r ? r.cleanDays : null} revertedToday={!!r && r.reverts > 0} /> : null}
        {r ? <span className={styles.cn}>{r.cleanDays}</span> : null}
      </Cell>
    </>
  );
}
