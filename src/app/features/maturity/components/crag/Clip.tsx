import type { ClipView } from '../../model/crag/routes';
import { clipBox, type CragGeom } from '../../model/crag/geometry';
import { cx, onActivate } from '../cx';
import styles from './clip.module.css';

/** A pickable gap tag on a route's next bolt: "g1", "g1 ✓" once picked, the MR id once sent. Click or Enter picks. */
export function Clip({ clip, g, x, y, onPick }: { clip: ClipView; g: CragGeom; x: number; y: number; onPick: (id: string) => void }) {
  const s = g.scale;
  const box = clipBox(g, clip.label, x);
  const pick = () => onPick(clip.id);
  return (
    <g
      className={cx(styles.clip, clip.picked && styles.picked, clip.sent && styles.sent)}
      tabIndex={0}
      role="button"
      aria-pressed={clip.picked}
      aria-label={clip.ariaLabel}
      onClick={pick}
      onKeyDown={onActivate(pick)}
    >
      <title>{clip.title}</title>
      <circle className={styles.ring} cx={x} cy={y} r={8 * s} />
      <rect className={styles.pill} x={box.x} y={y - 9 * s} width={box.w} height={18 * s} rx={9 * s} />
      <text x={box.x + box.w / 2} y={y + 4 * s} textAnchor="middle">
        {clip.label}
      </text>
    </g>
  );
}
