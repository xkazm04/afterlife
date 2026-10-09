import { EVIDENCE_RUNG, type Snapshot } from '../../model/derive/snapshots';
import type { TheaterDemo } from '../../model/types';
import { Card } from '@/components/surface/Card';
import styles from './Board.module.css';

/** The closing wall: nine stages as nine tiles, each with its rung steps and the evidence the last scan saw. */
export function Board({ snap, demo, last }: { snap: Snapshot; demo: TheaterDemo; last: boolean }) {
  return (
    <div className={styles.board}>
      <div className={styles.big}>
        {snap.stagesN}
        <small>/ 9 stages with evidence</small>
      </div>
      <div className={styles.tiles}>
        {demo.stages.map((st) => {
          const r = snap.rungs[st] ?? 0;
          const m = demo.rungs.find((x) => x.stage === st);
          return (
            <Card key={st} className={`${styles.tile} ${r >= EVIDENCE_RUNG ? styles.evd : ''}`} title={m?.evidence}>
              <div className={styles.tn}>
                <span>{st}</span>
                <span className={styles.rr}>R{r}</span>
              </div>
              <div className={styles.steps}>
                {[1, 2, 3, 4].map((k) => (
                  <i key={k} className={r >= k ? styles.on : undefined} />
                ))}
              </div>
              <div className={styles.evt}>
                {demo.rungNames[r]} · {m?.evidence}
                {m && m.day0 == null ? ' · day 0 ?' : ''}
              </div>
            </Card>
          );
        })}
      </div>
      <div className={styles.line}>
        {last ? (
          <>
            Autonomy that can be <b>taken away</b>.
          </>
        ) : (
          'Topped out. The nine stages, as the last scan saw them.'
        )}
      </div>
    </div>
  );
}
