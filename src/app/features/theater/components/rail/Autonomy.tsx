import { TierChip } from '@/components/status/TierChip';
import { SHOW_CLASSES, TIER_WHY } from '../../data/constants';
import type { Snapshot } from '../../model/derive/snapshots';
import { Card } from '@/components/surface/Card';
import styles from './Rail.module.css';

const LEDGER_WHY = 'The tier at the time, as the ledger event states it';

/**
 * Autonomy: the action classes with their tier chips. A demotion makes its chip drop. The illustrative film shows the
 * loop's three classes; a real film (`fromLedger`) the classes its events name, at the tier each event states.
 */
export function Autonomy({ snap, fromLedger }: { snap: Snapshot; fromLedger: boolean }) {
  const rows = fromLedger ? Object.keys(snap.tiers).map((cls) => ['', cls] as const) : SHOW_CLASSES;
  return (
    <Card className={styles.blk}>
      <div className={styles.bh}>Autonomy</div>
      {rows.map(([track, cls]) => {
        const tier = snap.tiers[cls] ?? 'human_only';
        const why = fromLedger ? LEDGER_WHY : tier === 'quarantined' ? TIER_WHY.quarantined : tier === 'hands_off' ? TIER_WHY.hands_off : cls === 'qa.file-bug' ? TIER_WHY.bug : TIER_WHY.other;
        return (
          <div key={cls} className={`${styles.cls} ${snap.droppedNow === cls ? styles.drop : ''}`} title={why}>
            <span className={styles.id}>
              {track ? <span>{track}</span> : null}
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
