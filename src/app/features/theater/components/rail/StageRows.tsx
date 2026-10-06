import { EVIDENCE_RUNG, type Snapshot } from '../../model/derive/snapshots';
import type { TheaterDemo } from '../../model/types';
import { Card } from '@/components/surface/Card';
import styles from './Rail.module.css';

/** Stages with evidence: nine rows of four rung steps, "n / 9" on top. A stage that just crossed into evidence lifts. */
export function StageRows({ snap, prev, demo }: { snap: Snapshot; prev?: Snapshot; demo: TheaterDemo }) {
  return (
    <Card className={`${styles.blk} ${styles.stgb}`}>
      <div className={styles.bh}>
        Stages with evidence
        <span className={styles.aux}>
          {snap.stagesN}
          <small> / 9</small>
        </span>
      </div>
      <div className={styles.srows}>
        {demo.stages.map((st) => {
          const r = snap.rungs[st] ?? 0;
          const before = prev?.rungs[st] ?? r;
          const cls = [styles.srow, r >= EVIDENCE_RUNG ? styles.evd : '', before < EVIDENCE_RUNG && r >= EVIDENCE_RUNG ? styles.up : ''];
          return (
            <div key={st} className={cls.filter(Boolean).join(' ')} title={`${st} · R${r} ${demo.rungNames[r] ?? ''}`}>
              <span>{st}</span>
              <span className={styles.bar}>
                {[1, 2, 3, 4].map((k) => (
                  <i key={k} className={r >= k ? styles.on : undefined} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
