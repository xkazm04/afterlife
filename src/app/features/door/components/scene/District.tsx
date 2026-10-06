'use client';

import { memo, useMemo } from 'react';
import { towerLabel } from '../../model/words';
import { paintOrder, type District as D } from '../../model/city';
import { plateShape, towerShape, type TowerShape } from '../../model/shapes';
import styles from './city.module.css';

const TIER_CLASS: Record<string, string> = {
  hands_off: styles.wHandsOff!,
  supervised: styles.wSupervised!,
  assisted: styles.wAssisted!,
  quarantined: styles.wQuarantined!,
  human_only: styles.wHuman!,
  null: styles.wNull!,
};

function Tower({ s }: { s: TowerShape }) {
  if (s.kind === 'nsu') {
    return (
      <>
        <polygon className={styles.hit} points={s.hit} />
        <polygon className={styles.nsuFoot} points={s.foot} />
        <path className={styles.nsuGhost} d={s.ghost} />
      </>
    );
  }
  if (s.kind === 'setup') {
    return (
      <>
        <polygon className={styles.hit} points={s.hit} />
        <path className={`${styles.tEdge} ${styles.dashed}`} d={s.edge} />
        <path className={styles.pole} d={s.poles} />
      </>
    );
  }
  return (
    <>
      <polygon className={styles.tL} points={s.faces!.l} />
      <polygon className={styles.tR} points={s.faces!.r} />
      <polygon className={styles.tTop} points={s.faces!.top} />
      {s.hatch ? <path className={styles.tHatch} d={s.hatch} /> : null}
      <g className={styles.win}>
        {Object.entries(s.windows).map(([tier, d]) => (
          <path key={tier} className={TIER_CLASS[tier]} d={d} />
        ))}
      </g>
      {s.halo ? <path className={styles.tHalo} d={s.halo} /> : null}
      <path className={styles.tEdge} d={s.edge} />
      {s.lamps.map(([x, y], i) => (
        <g key={i} className={styles.qLamp}>
          <circle cx={x} cy={y} r={4.2} className={styles.qBloom} />
          <circle cx={x} cy={y} r={1.9} />
        </g>
      ))}
    </>
  );
}

/**
 * One district as its own static SVG layer: the plate, light spilling from its beams, and its towers back to front.
 * Hovering, dimming and the intro move the whole layer (compositor only); the drawing itself rasters once.
 */
export const District = memo(function District({
  d,
  classes,
  dim,
  open,
  tabbable,
}: {
  d: D;
  classes: readonly string[];
  /** Ids of towers to dim (a lit answer mark), or null. */
  dim: ReadonlySet<string> | null;
  /** The district opened at L1/L2: its windows light up and its lamps step aside. Only this layer re-renders. */
  open: boolean;
  /** At L1 the open district's towers take Tab and Enter. */
  tabbable: boolean;
}) {
  const plate = useMemo(() => plateShape(d), [d]);
  const towers = useMemo(() => paintOrder(d).map((t) => ({ t, s: towerShape(t, classes) })), [d, classes]);
  return (
    <svg className={styles.svg} data-open={open || undefined} width="1600" height="1000" viewBox="0 0 1600 1000">
      <g data-g={d.gi} className={styles.plate}>
        <ellipse fill="url(#d-shadow)" cx={plate.c[0]} cy={plate.c[1] + 22} rx={d.w * 0.62} ry={d.w * 0.31} />
        <ellipse fill="url(#d-plglow)" cx={plate.c[0]} cy={plate.c[1] + 12} rx={d.w * 0.75} ry={d.w * 0.38} />
        <polygon className={styles.plL} points={plate.l} />
        <polygon className={styles.plR} points={plate.r} />
        <polygon className={styles.plTop} points={plate.top} />
        <path className={styles.plCells} d={plate.cells} />
        <path className={styles.plBack} d={plate.back} />
        <path className={styles.plEdge} d={plate.edge} />
        {plate.spills.map((s, i) => (
          <ellipse key={i} fill="url(#d-spill)" opacity={s.stale ? 0.4 : 1} cx={s.x} cy={s.y} rx={s.rx} ry={s.rx / 2} />
        ))}
      </g>
      {towers.map(({ t, s }) => (
        <g
          key={t.p.id}
          data-p={t.p.id}
          className={`${styles.tw} ${t.p.state === 'stale' ? styles.stale : ''} ${dim && dim.has(t.p.id) ? styles.dimx : ''}`}
          transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`}
          role="button"
          tabIndex={tabbable ? 0 : -1}
          aria-label={towerLabel(t.p)}
        >
          <Tower s={s} />
        </g>
      ))}
    </svg>
  );
});
