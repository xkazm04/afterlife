'use client';

import { CX, CY, type Cutaway } from '../../model/cutaway';
import styles from './l2tower.module.css';

const LETTER: Record<string, string> = { hands_off: 'H', supervised: 'S', assisted: 'A', quarantined: 'Q', human_only: 'P', no_record: '–', refused: '!' };

/** The cutaway (Night Shift's L2): floors lit by rung, tier windows, the antenna and its tag, the roof beacon. */
export function L2Tower({ c, hotClass, onClass }: { c: Cutaway; hotClass: number | null; onClass: (i: number | null) => void }) {
  const m = c.mode ? styles[c.mode] : '';
  return (
    <svg className={styles.svg} width="1600" height="1000" viewBox="0 0 1600 1000" data-role="door-l2-art">
      <g className={c.stale ? styles.isStale : undefined}>
        <ellipse fill="url(#d-pool)" cx={CX} cy={CY} rx={c.rings.pool[0]} ry={c.rings.pool[1]} />
        <ellipse className={styles.ring} cx={CX} cy={CY} rx={c.rings.a[0]} ry={c.rings.a[1]} />
        <ellipse className={`${styles.ring} ${styles.dash}`} cx={CX} cy={CY} rx={c.rings.b[0]} ry={c.rings.b[1]} />
        <polygon className={`${styles.foot} ${c.ghost ? styles.ghostFoot : ''}`} points={c.foot} />
        <path className={`${styles.e2} ${m}`} d={c.spine} opacity={0.45} />
        {c.floors.map((f) => (
          <g key={f.i} className={styles[`r${f.rung ?? 'null'}`]}>
            {f.rung == null ? <path className={styles.lip2} d={f.lip} /> : <polygon className={styles.lip} points={f.lip} />}
            <polygon className={styles.flTop} points={f.top} />
            {f.q ? (
              <text className={styles.q} x={f.q[0]} y={f.q[1] + 7} textAnchor="middle">
                ?
              </text>
            ) : null}
          </g>
        ))}
        <polygon className={styles.glass} points={c.glass} />
        <polygon className={`${styles.wall} ${c.ghost || c.scaf ? styles.open : ''}`} points={c.wall} />
        {c.stale ? <polygon fill="url(#d-hatch)" points={c.wall} /> : null}
        {c.windows.map((w) => (
          <g key={w.k} onPointerEnter={() => onClass(w.i)} onPointerLeave={() => onClass(null)}>
            <polygon className={`${styles.win} ${styles[`w_${w.tier ?? 'null'}`]} ${hotClass === w.i ? styles.on : ''}`} points={w.poly} />
            {w.tier ? (
              <text className={`${styles.wl} ${styles[`w_${w.tier}`]}`} x={w.c[0]} y={w.c[1] + 7}>
                {LETTER[w.tier]}
              </text>
            ) : null}
          </g>
        ))}
        <polygon className={`${styles.roof} ${c.ghost || c.scaf ? styles.open : c.stale ? styles.roofSt : ''}`} points={c.roof} />
        {c.stale ? <polygon fill="url(#d-hatch)" points={c.roof} /> : null}
        {!c.mode ? <path className={styles.e2h} d={c.edges} /> : null}
        <path className={`${styles.e2} ${m}`} d={c.edges} />
        {c.stale ? (
          <rect className={styles.mastH} x={c.mast.from[0] - 3} y={c.mast.tip[1]} width={6} height={128} />
        ) : (
          <path className={`${styles.mast} ${c.mast.never ? styles.ghost : ''}`} d={`M${c.mast.from[0]} ${c.mast.from[1]} L${c.mast.tip[0]} ${c.mast.tip[1]}`} />
        )}
        <circle className={`${styles.tip} ${c.stale ? styles.tipSt : c.mast.never ? styles.tipGhost : ''}`} cx={c.mast.tip[0]} cy={c.mast.tip[1]} r={6} />
        <rect className={styles.tagBg} x={c.tag.x} y={c.tag.y} width={c.tag.w} height={c.tag.h} rx={6} />
        {c.tag.lines.map((l, i) => (
          <text key={i} className={`${styles.tagT} ${styles[`t_${c.tag.tone}`]}`} x={c.tag.x + 13} y={c.tag.y + 26 + i * 25}>
            {l}
          </text>
        ))}
        {c.beacon ? <Beacon b={c.beacon} /> : null}
        {c.scaffold ? (
          <>
            <path className={`${styles.e2} ${styles.scaf}`} d={c.scaffold.d} />
            <circle className={styles.light} cx={c.scaffold.light[0]} cy={c.scaffold.light[1]} r={5} />
          </>
        ) : null}
      </g>
      {c.floors.map((f) => (
        <g key={f.i}>
          <text x={f.label.x} y={f.label.y} textAnchor="end">
            <tspan className={styles.flName}>{f.label.name}</tspan>
            <tspan className={`${styles.rung} ${f.rung == null ? styles.rungU : f.rung === 0 ? styles.rungZ : ''}`} dx="10">
              {f.rung == null ? '?' : `R${f.rung}`}
            </tspan>
          </text>
          <path d={f.tick} className={styles.tick} />
        </g>
      ))}
      <text className={styles.leg} x="40" y="904">
        Floors lit by rung, dashed = unknown
      </text>
      <text className={styles.leg} x="40" y="928">
        R0 absent · R1 configured · R2 running · R3 enforced · R4 self-proving
      </text>
    </svg>
  );
}

function Beacon({ b }: { b: NonNullable<Cutaway['beacon']> }) {
  const lw = b.label.length * 12 + 26;
  return (
    <g>
      <rect fill={b.stale ? 'url(#d-beam-st)' : 'url(#d-beam)'} filter="url(#d-bloom2)" x={b.x - b.w} y={b.y - b.h} width={b.w * 2} height={b.h} />
      <rect fill={b.stale ? 'url(#d-beam-st)' : 'url(#d-beam)'} x={b.x - b.w / 2} y={b.y - b.h} width={b.w} height={b.h} />
      {b.stale ? (
        <rect fill="url(#d-hatch-amber)" x={b.x - b.w / 2} y={b.y - b.h * 0.7} width={b.w} height={b.h * 0.7} />
      ) : (
        <rect fill="url(#d-core)" x={b.x - 1.5} y={b.y - b.h * 0.95} width={3} height={b.h * 0.95} />
      )}
      <ellipse fill="url(#d-lamp)" cx={b.x} cy={b.y} rx={70} ry={32} />
      <ellipse className={b.stale ? styles.lampSt : styles.lamp} cx={b.x} cy={b.y} rx={22} ry={11} />
      <rect className={b.stale ? styles.bcBgSt : styles.bcBg} x={b.x - b.w / 2 - 18 - lw} y={b.y - 96} width={lw} height={36} rx={7} />
      <text className={b.stale ? styles.bcTSt : styles.bcT} x={b.x - b.w / 2 - 18 - lw / 2} y={b.y - 71} data-role="door-l2-beacon">
        {b.label}
      </text>
    </g>
  );
}
