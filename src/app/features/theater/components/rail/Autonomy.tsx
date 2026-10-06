import { TierChip } from '@/components/status/TierChip';
import { SHOW_CLASSES, TIER_WHY } from '../../data/constants';
import type { Snapshot } from '../../model/derive/snapshots';
import { Card } from '../parts/Card';
import styles from './Rail.module.css';

/** Autonomy: the three action classes of the loop with their tier chips. A demotion makes its chip drop. */
export function Autonomy({ snap }: { snap: Snapshot }) {
  return (
    <Card className={styles.blk}>
      <div className={styles.bh}>Autonomy</div>
      {SHOW_CLASSES.map(([track, cls]) => {
        const tier = snap.tiers[cls] ?? 'human_only';
        const why = tier === 'quarantined' ? TIER_WHY.quarantined : tier === 'hands_off' ? TIER_WHY.hands_off : cls === 'qa.file-bug' ? TIER_WHY.bug : TIER_WHY.other;
        return (
          <div key={cls} className={`${styles.cls} ${snap.droppedNow === cls ? styles.drop : ''}`} title={why}>
            <span className={styles.id}>
              <span>{track}</span>
              {cls}
            </span>
            <span className={styles.tier}>
              <TierChip tier={tier} />
            </span>
          </div>
        );
      })}
    </Card>
  );
}
