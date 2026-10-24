import type { CSSProperties } from 'react';
import { TierChip } from '@/components/status/TierChip';
import { EVIDENCE } from '../../../data/cra';
import { linksCount } from '../../../model/clock/grades';
import styles from './track.module.css';

/**
 * How many ticks the "4 / 6" count resolves; 0 when it is not held or does not read as one. While the count says a link
 * is unresolved (the grade is draft), one tick at least stays open, whatever the count's numbers.
 */
function resolvedCount(resolved: string): number {
  const c = linksCount(resolved);
  if (!c) return 0;
  return Math.min(c.resolved, c.resolved < c.total ? EVIDENCE.length - 1 : EVIDENCE.length);
}

/** One tick per evidence link, resolved as far as the count says, and the "submit" chip: report.submit is Human only. */
export function EvidenceStrip({ resolved }: { resolved: string }) {
  const n = resolvedCount(resolved);
  return (
    <div className={styles.bl}>
      <span className={styles.lbx}>Evidence {resolved || 'not held'}</span>
      <span className={styles.row}>
        <span className={styles.evd} style={{ '--evd-n': EVIDENCE.length } as CSSProperties}>
          {EVIDENCE.map((e, i) => {
            const label = `${e.what} · ${e.ref} · ${i < n ? 'resolves' : 'not resolved'}`;
            return (
              <i key={e.what} role="img" aria-label={label} title={label} className={i < n ? undefined : styles.evdOpen}>
                {i < n ? '✓' : '·'}
              </i>
            );
          })}
        </span>
        <span className={styles.sub} title="report.submit is Human only: Belay never submits">
          <TierChip tier="human_only">submit</TierChip>
        </span>
      </span>
    </div>
  );
}
