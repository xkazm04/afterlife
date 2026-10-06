import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { craLeft } from '../../model/derive/time';
import type { Snapshot } from '../../model/derive/snapshots';
import { Card } from '@/components/surface/Card';
import styles from './Rail.module.css';

/** CRA early warning: the clock to the 24 h report, counting down as the slice plays. Seeded drill, simulated clock. */
export function CraBlock({ snap }: { snap: Snapshot }) {
  return (
    <Card className={styles.blk} title="Seeded drill on a simulated clock">
      <div className={styles.bh}>CRA early warning</div>
      <div className={styles.cv}>
        {craLeft(snap.e.t)}
        <small>to the early warning</small>
      </div>
      <div className={styles.tags}>
        <HonestyChip kind="seeded" />
        <HonestyChip kind="simulated" />
      </div>
    </Card>
  );
}
