import type { Stage } from '@/schemas';
import { markY, ropePath, type CragGeom } from '../../model/crag/geometry';
import type { RouteView } from '../../model/crag/routes';
import { rungText, type Mode } from '../../model/rungs';
import { cx, onActivate } from '../cx';
import { Clip } from './Clip';
import styles from './crag.module.css';
import ropes from './ropes.module.css';

/**
 * One stage's route: the column that selects it, then the rope, bolts (rungs), d0 chalk tick, climber and next ring,
 * then its gap tag. Unknown is a dashed rope and a "?", never zero. Decoration ignores the pointer; the column and
 * the tag are the targets.
 */
export function Route({
  v,
  g,
  mode,
  animKey,
  onSelect,
  onPick,
}: {
  v: RouteView;
  g: CragGeom;
  mode: Mode;
  animKey: number;
  onSelect: (stage: Stage) => void;
  onPick: (id: string) => void;
}) {
  const s = g.scale;
  const i = v.index;
  const x = g.xOf(i);
  const { lv } = v;
  const target = mode === 'target';
  const nowDeep = v.now != null && v.now >= 3;
  const select = () => onSelect(v.stage);
  const ringAt = v.ring != null ? { x: x + g.jig(i, v.ring), y: g.yOf(v.ring) } : null;
  const x0 = x - g.colW * 0.36;
  const d0 = v.day0;

  return (
    <g>
      <rect
        className={cx(styles.col, v.selected && styles.sel)}
        x={x - g.colW / 2 + 3 * s}
        y={10 * s}
        width={g.colW - 6 * s}
        height={g.H - 14 * s}
        rx={8 * s}
        data-stage={v.stage}
        tabIndex={0}
        role="button"
        aria-pressed={v.selected}
        aria-label={v.ariaLabel}
        onClick={select}
        onKeyDown={onActivate(select)}
      />
      <g className={styles.inert}>
        <path className={styles.lineup} d={ropePath(g, i, 0, 4)} />
        <g key={animKey}>
          {lv == null ? (
            <>
              <path className={cx(ropes.rope, ropes.unk)} d={ropePath(g, i, 0, 4)} />
              <circle className={ropes.qmark} cx={x} cy={g.Y0 - 26 * s} r={9 * s} />
              <text className={ropes.qtext} x={x} y={g.Y0 - 22 * s} textAnchor="middle">
                ?
              </text>
            </>
          ) : target ? (
            <>
              {v.now != null && v.now > 0 ? <path className={cx(ropes.rope, nowDeep && ropes.deep)} d={ropePath(g, i, 0, v.now)} /> : null}
              {lv > (v.now ?? 0) ? <path className={cx(ropes.rope, ropes.ghost)} d={ropePath(g, i, v.now ?? 0, lv)} /> : null}
            </>
          ) : lv > 0 ? (
            <path className={cx(ropes.rope, ropes.draw, v.deep && ropes.deep)} pathLength={1} d={ropePath(g, i, 0, lv)} />
          ) : null}
        </g>
        {[1, 2, 3, 4].map((r) => {
          const on = lv != null && r <= lv && !(target && r > (v.now ?? 0));
          return (
            <circle
              key={r}
              className={cx(ropes.bolt, on && ropes.on, on && v.deep && ropes.deep)}
              cx={x + g.jig(i, r)}
              cy={g.yOf(r)}
              r={(on ? 3.5 : 3) * s}
            />
          );
        })}
        {v.chalk ? (
          d0 == null ? (
            <text className={ropes.chalkt} x={x0} y={g.Y0 - 2 * s}>
              d0 ?
            </text>
          ) : (
            <>
              <line className={ropes.chalk} x1={x0 + g.jig(i, d0)} x2={x0 + g.jig(i, d0) + 12 * s} y1={markY(g, d0, 4)} y2={markY(g, d0, 4)} />
              <text className={ropes.chalkt} x={x0 + g.jig(i, d0)} y={markY(g, d0, 4) - 5 * s}>
                d0
              </text>
            </>
          )
        ) : null}
        {lv != null && !target ? <circle className={ropes.climber} cx={x + g.jig(i, lv)} cy={markY(g, lv, 2)} r={5 * s} /> : null}
        {ringAt && !v.clip ? <circle className={ropes.ring} cx={ringAt.x} cy={ringAt.y} r={8 * s} /> : null}
        <text className={cx(styles.slab, v.selected && styles.slabSel)} x={x} y={g.Y0 + 36 * s} textAnchor="middle">
          {v.stage}
        </text>
        <text className={cx(styles.slab2, v.deep && styles.deepText)} x={x} y={g.Y0 + 50 * s} textAnchor="middle">
          {rungText(lv)}
        </text>
      </g>
      {ringAt && v.clip ? <Clip clip={v.clip} g={g} x={ringAt.x} y={ringAt.y} onPick={onPick} /> : null}
    </g>
  );
}
