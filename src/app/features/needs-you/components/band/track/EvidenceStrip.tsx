import { TierChip } from '@/components/status/TierChip';
import { EVIDENCE } from '../../../data/cra';
import styles from './track.module.css';

/** One tick per evidence link (all resolve), and the "submit" chip: report.submit is Human only. */
export function EvidenceStrip({ resolved }: { resolved: string }) {
  return (
    <div className={styles.bl}>
      <span className={styles.lbx}>Evidence {resolved}</span>
      <span className={styles.row}>
        <span className={styles.evd}>
          {EVIDENCE.map((e) => (
            <i key={e.what} title={`${e.what} · ${e.ref} · resolves`}>
              ✓
            </i>
          ))}
        </span>
        <span className={styles.sub} title="report.submit is Human only: Belay never submits">
          <TierChip tier="human_only">submit</TierChip>
        </span>
      </span>
    </div>
  );
}
