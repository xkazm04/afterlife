import { MAX_TOTAL } from '../../model/replay';
import type { GridColumn } from '../../model/grid';
import grid from './grid.module.css';
import styles from './trajectory.module.css';

const H = 48;

/**
 * The trajectory band over the grid: rungs held after each column. The record is a solid line; open cycles continue
 * it dashed to what they would hold if every change earned its rung. One point per column, centred. The scale runs
 * from 0 to a little above the highest point (never past 36, the most a project can hold), so the climb reads.
 */
export function Trajectory({ columns, selected }: { columns: readonly GridColumn[]; selected: string }) {
  const n = columns.length;
  const top = Math.min(MAX_TOTAL, Math.ceil(Math.max(...columns.map((c) => c.projected ?? c.total)) * 1.15));
  const y = (v: number) => H - 4 - (v / top) * (H - 8);
  const pts = columns.map((c, i) => ({ x: i + 0.5, y: y(c.projected ?? c.total), open: c.projected != null, key: c.key }));
  const firstOpen = pts.findIndex((p) => p.open);
  const record = firstOpen < 0 ? pts : pts.slice(0, firstOpen);
  const ahead = firstOpen < 0 ? [] : pts.slice(firstOpen - 1);
  const line = (ps: typeof pts) => ps.map((p) => `${p.x},${p.y}`).join(' ');
  const [first, end] = [record[0], record[record.length - 1]];
  if (!first || !end) return null;
  return (
    <div className={grid.row} role="row" aria-hidden="true">
      <span className={grid.stage}>Trajectory</span>
      <span className={styles.traj}>
        <svg viewBox={`0 0 ${n} ${H}`} preserveAspectRatio="none">
          <line className={styles.cap} x1="0" x2={n} y1={y(top)} y2={y(top)} vectorEffect="non-scaling-stroke" />
          <polygon className={styles.area} points={`${first.x},${H} ${line(record)} ${end.x},${H}`} />
          <polyline className={styles.rec} points={line(record)} vectorEffect="non-scaling-stroke" />
          {ahead.length > 1 ? <polyline className={styles.ahead} points={line(ahead)} vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        {pts.map((p) => (
          <i
            key={p.key}
            className={styles.pt}
            data-open={p.open || undefined}
            data-sel={p.key === selected || undefined}
            style={{ left: `${(p.x / n) * 100}%`, top: `${(p.y / H) * 100}%` }}
          />
        ))}
        <span className={styles.capLabel}>{top === MAX_TOTAL ? `${top} max` : top}</span>
      </span>
    </div>
  );
}
