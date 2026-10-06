'use client';

import { memo, useMemo } from 'react';
import { FA, FB, type District } from '../../model/city';
import { beamsOf, bracketsPath, districtGlows } from '../../model/shapes';
import type { Placed } from '../../model/city';
import styles from './beams.module.css';

/**
 * Every decision as light: one amber beam per waiting project, a lamp on its roof, a glow above each district, and a
 * soft bloom. The layer is static (the bloom is a filtered copy rastered once); its slow breathing is one opacity
 * animation on the whole layer, which the compositor runs without repainting anything.
 */
export const Beams = memo(function Beams({ ds, dim }: { ds: readonly District[]; dim: ReadonlySet<string> | null }) {
  const beams = useMemo(() => beamsOf(ds), [ds]);
  const glows = useMemo(() => districtGlows(ds), [ds]);
  return (
    <svg className={styles.svg} width="1600" height="1000" viewBox="0 0 1600 1000" aria-hidden>
      <use href="#d-beams" filter="url(#d-bloom)" className={styles.bloom} data-lite="off" />
      <g id="d-beams">
        <g className={styles.glows}>
          {glows.map((g, i) => (
            <ellipse key={i} fill="url(#d-dglow)" cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} opacity={g.opacity} />
          ))}
        </g>
        {beams.map((b) => (
          <g key={b.id} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`} className={dim && dim.has(b.id) ? styles.dimx : undefined}>
            <g className={styles.body}>
              <rect fill={b.stale ? 'url(#d-beam-st)' : 'url(#d-beam)'} x={-b.w / 2} y={-b.H} width={b.w} height={b.H} />
              {b.stale ? (
                <rect fill="url(#d-hatch-amber)" x={-b.w / 2} y={-b.H * 0.7} width={b.w} height={b.H * 0.7} />
              ) : (
                <rect fill="url(#d-core)" x={-1} y={-b.H * 0.92} width={2} height={b.H * 0.92} />
              )}
            </g>
            <ellipse fill="url(#d-lamp)" rx={FA * 1.15} ry={FB * 1.15} />
            <ellipse className={b.stale ? styles.lampStale : styles.lamp} rx={FA * 0.55} ry={FB * 0.55} />
          </g>
        ))}
      </g>
    </svg>
  );
});

/** The blinking work lights over towers being set up: their own layer, one opacity animation for all of them. */
export const SetupLights = memo(function SetupLights({ ds }: { ds: readonly District[] }) {
  const lights = useMemo(() => ds.flatMap((d) => d.placed).filter((t) => t.p.state === 'setting-up'), [ds]);
  return (
    <svg className={`${styles.svg} ${styles.blink}`} data-ambient="city" width="1600" height="1000" viewBox="0 0 1600 1000" aria-hidden>
      {lights.map((t) => (
        <circle key={t.p.id} className={styles.light} cx={t.x} cy={t.y + FB - t.h - 11} r={2.4} />
      ))}
    </svg>
  );
});

/**
 * What the pointer is on, drawn above the city so the city never repaints for it: the hot district's front edge in
 * cyan with its pink ghost under it, and pink corner brackets around a hot tower.
 */
export function HoverMarks({ hot, tower }: { hot: District | null; tower: Placed | null }) {
  return (
    <svg className={styles.svg} width="1600" height="1000" viewBox="0 0 1600 1000" aria-hidden>
      {hot ? (
        <>
          <path className={styles.hotEdge} d={`M${hot.L[0]} ${hot.L[1]} L${hot.B[0]} ${hot.B[1]} L${hot.R[0]} ${hot.R[1]}`} />
          <path className={styles.hotGhost} d={`M${hot.L[0]} ${hot.L[1] + 2} L${hot.B[0]} ${hot.B[1] + 2} L${hot.R[0]} ${hot.R[1] + 2}`} />
          <path className={styles.hotBack} d={`M${hot.L[0]} ${hot.L[1]} L${hot.Tp[0]} ${hot.Tp[1]} L${hot.R[0]} ${hot.R[1]}`} />
        </>
      ) : null}
      {tower ? <path className={styles.brk} d={bracketsPath(tower)} /> : null}
    </svg>
  );
}
