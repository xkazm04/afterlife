import type { CSSProperties } from 'react';
import { TierChip } from '@/components/status/TierChip';
import { EVIDENCE } from '../../../data/cra';
import styles from './track.module.css';

/** How many links the "4 / 6" count says resolve; 0 when the count is not held or does not read as one. */
function resolvedCount(resolved: string): number {
  const m = /^\s*(\d+)\s*\/\s*\d+\s*$/.exec(resolved);
  return m ? Math.min(EVIDENCE.length, Number(m[1])) : 0;
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
