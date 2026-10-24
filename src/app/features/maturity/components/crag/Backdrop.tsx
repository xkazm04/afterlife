import { MAT_META } from '../../data/meta';
import { markY, wavyPath, type CragGeom } from '../../model/crag/geometry';
import { rungLabel, TOP_RUNG } from '../../model/rungs';
import styles from './crag.module.css';
import { cx } from '../cx';

/** R0 up to the top rung: the model's TOP_RUNG decides, so a fifth rung reaches the contours and labels too. */
const LEVELS = Array.from({ length: TOP_RUNG + 1 }, (_, r) => r);

/** The cliff behind the routes: hatched ground, contour lines between the rungs, and a label per rung. */
export function Backdrop({ g, hatchId, rungNames }: { g: CragGeom; hatchId: string; rungNames: readonly string[] }) {
  const s = g.scale;
  const gap = g.yOf(0) - g.yOf(1);
  const art = (
    <g className={styles.inert}>
      <defs>
        <pattern id={hatchId} width={6 * s} height={6 * s} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line className={styles.hatchLine} x1="0" y1="0" x2="0" y2={6 * s} />
        </pattern>
      </defs>
      <rect fill={`url(#${hatchId})`} x={g.L - 6 * s} y={g.Y0 - 14 * s} width={g.W - g.L - g.RGT + 12 * s} height={30 * s} rx={6 * s} />
      {LEVELS.slice(1).map((r) => (
        <g key={r}>
          <path className={styles.contour} d={wavyPath(g, g.yOf(r) + gap * 0.33, 3, r * 1.7)} />
          <path className={styles.contour} d={wavyPath(g, g.yOf(r) + gap * 0.66, 2, r * 2.3)} />
          <path className={cx(styles.contour, styles.main)} d={wavyPath(g, g.yOf(r), 4, r)} />
        </g>
      ))}
    </g>
  );
  // Outside the inert group: a <title> tooltip needs the pointer, and the group sets pointer-events: none.
  const labels = LEVELS.map((r) => {
    const y = markY(g, r, 4);
    const name = rungNames[r] ?? '';
    return (
      <g key={r}>
        <title>{`${rungLabel(r, rungNames)}: ${MAT_META.rungMeans[r] ?? ''}`}</title>
        <text className={styles.rlab} x={14 * s} y={y - s}>{`R${r}`}</text>
        <text className={styles.rlab2} x={14 * s} y={y + 13 * s}>{name}</text>
      </g>
    );
  });
  return (
    <>
      {art}
      {labels}
    </>
  );
}
