import { layoutAxis } from '../../../model/view/timeline';
import type { LedgerEntry } from '../../../model/types';
import styles from './log.module.css';

// kit-candidate: the prototype's .axis, a to-scale timeline of who acted when (the lag of a poll is a visible gap).
export function Axis({ events }: { events: readonly LedgerEntry[] }) {
  const { points, gap, span } = layoutAxis(events);
  return (
    <div className={styles.axis} title={`to scale: ${span} s from first to last`}>
      {gap ? (
        <>
          <span className={styles.gap} style={{ left: `${gap.left}%`, width: `${gap.width}%` }} />
          <span className={styles.gapl} style={{ left: `${gap.mid}%` }}>
            {gap.label}
          </span>
        </>
      ) : null}
      {points.map((p, i) => (
        <span key={i}>
          <span className={`${styles.dot} ${styles[`k-${p.kind}`]}`} style={{ left: `${p.x}%` }} />
          <span className={`${styles.al} ${p.row === 1 ? styles.b1 : styles.b2} ${p.edge ? styles[p.edge] : ''}`} style={{ left: `${p.x}%` }}>
            {p.label}
          </span>
        </span>
      ))}
    </div>
  );
}
