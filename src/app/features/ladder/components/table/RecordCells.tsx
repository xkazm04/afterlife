import { Cell } from '@/components/table/Cell';
import { DayStrip } from '@/components/viz/DayStrip';
import { pct } from '@/lib/promotion';
import type { PolicyRules } from '@/server/data/types';
import { belowNoEdit, leaseLeft } from '../../model/grant/lease';
import type { ClassRow } from '../../model/types';
import styles from './ladderTable.module.css';

const NO_RECORD = 'No record yet · not scored';
const NOT_RECORDED = 'Not recorded · no task or ledger event states it';
const LAPSED = 'Lease lapsed: the gate decides at Supervised until a person re-confirms';

/**
 * Lease, Acc, No-edit, Rv and the 14-day strip. No record, or a counter not recorded, is a dim dash (never zero); Human
 * only has no record. The lease is of the policy's grant_ttl_days (none when it sets none; a lapsed one reads lapsed), No-edit
 * dims below its bar.
 */
export function RecordCells({ cls, policy, className }: { cls: ClassRow; policy: PolicyRules | null; className?: string }) {
  const r = cls.record;
  const none = r || cls.tier === 'human_only' ? null : (
    <span className={styles.z} title={NO_RECORD}>
      —
    </span>
  );
  const unknown = (
    <span className={styles.z} title={NOT_RECORDED}>
      —
    </span>
  );
  const lease = leaseLeft(cls.lease_days, policy);
  // lease_days 0 is a Hands-off lease already past (the index clamps it): the engine gates it at Supervised
  const lapsed = cls.tier === 'hands_off' && cls.lease_days === 0;
  return (
    <>
      <Cell align="end" className={className}>
        {lapsed ? (
          <span className={styles.bad} title={LAPSED}>
            lapsed
          </span>
        ) : lease ? (
          <span title={`${lease}, then Supervised unless a person re-confirms`}>{cls.lease_days} d</span>
        ) : (
          <span className={styles.z}>—</span>
        )}
      </Cell>
      <Cell align="end" className={className}>
        {r ? (
          r.accepted === null ? (
            unknown
          ) : (
            <>
              {r.accepted}
              {r.needed ? <span className={styles.dn}>/{r.needed}</span> : null}
            </>
          )
        ) : (
          none
        )}
      </Cell>
      <Cell align="end" className={className}>
        {r ? r.noEdit === null ? unknown : <span className={belowNoEdit(r.noEdit, policy) ? styles.dn : undefined}>{pct(r.noEdit)}</span> : none}
      </Cell>
      <Cell align="center" className={className}>
        {r ? r.reverts === null ? unknown : <span className={r.reverts ? styles.bad : styles.z}>{r.reverts}</span> : none}
      </Cell>
      <Cell className={className}>
        {r || cls.tier !== 'human_only' ? <DayStrip clean={r ? r.cleanDays : null} revertedToday={!!r && (r.reverts ?? 0) > 0} /> : null}
        {r && r.cleanDays !== null ? <span className={styles.cn}>{r.cleanDays}</span> : null}
      </Cell>
    </>
  );
}
