import { MAT_META } from '../../data/meta';
import { wavyPath, type CragGeom } from '../../model/crag/geometry';
import styles from './crag.module.css';
import { cx } from '../cx';

/** The cliff behind the routes: hatched ground, contour lines between the rungs, and the R0-R4 labels. */
export function Backdrop({ g, hatchId, rungNames }: { g: CragGeom; hatchId: string; rungNames: readonly string[] }) {
  const s = g.scale;
  const gap = g.yOf(0) - g.yOf(1);
  return (
    <g className={styles.inert}>
      <defs>
        <pattern id={hatchId} width={6 * s} height={6 * s} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line className={styles.hatchLine} x1="0" y1="0" x2="0" y2={6 * s} />
        </pattern>
      </defs>
      <rect fill={`url(#${hatchId})`} x={g.L - 6 * s} y={g.Y0 - 14 * s} width={g.W - g.L - g.RGT + 12 * s} height={30 * s} rx={6 * s} />
      {[1, 2, 3, 4].map((r) => (
        <g key={r}>
          <path className={styles.contour} d={wavyPath(g, g.yOf(r) + gap * 0.33, 3, r * 1.7)} />
          <path className={styles.contour} d={wavyPath(g, g.yOf(r) + gap * 0.66, 2, r * 2.3)} />
          <path className={cx(styles.contour, styles.main)} d={wavyPath(g, g.yOf(r), 4, r)} />
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((r) => {
        const y = r === 0 ? g.Y0 + 4 * s : g.yOf(r);
        const name = rungNames[r] ?? '';
        return (
          <g key={r}>
            <title>{`R${r} ${name}: ${MAT_META.rungMeans[r] ?? ''}`}</title>
            <text className={styles.rlab} x={14 * s} y={y - s}>{`R${r}`}</text>
            <text className={styles.rlab2} x={14 * s} y={y + 13 * s}>{name}</text>
          </g>
        );
      })}
    </g>
  );
}
