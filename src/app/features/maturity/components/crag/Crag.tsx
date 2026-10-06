'use client';

import { useId, useRef } from 'react';
import type { Stage } from '@/schemas';
import { useElementSize } from '../../hooks/useElementSize';
import { cragGeom } from '../../model/crag/geometry';
import type { RouteView } from '../../model/crag/routes';
import { modeLabel, type Mode } from '../../model/rungs';
import { Backdrop } from './Backdrop';
import styles from './crag.module.css';
import { LegendButton } from './LegendButton';
import { Route } from './Route';

/**
 * The nine-pitch crag: one route per stage, bolts are rungs, the rope climbs as far as there is evidence. It fills the
 * space above the gaps table and re-draws at its own size, scaled by the text-size setting (`scale`).
 */
export function Crag({
  routes,
  mode,
  scannedAt,
  animKey,
  rungNames,
  scale,
  onSelect,
  onPick,
}: {
  routes: readonly RouteView[];
  mode: Mode;
  scannedAt: string;
  animKey: number;
  rungNames: readonly string[];
  scale: number;
  onSelect: (stage: Stage) => void;
  onPick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  const hatchId = useId();
  const g = cragGeom(size.w, size.h, scale);
  return (
    <div ref={ref} className={styles.wrap} data-crag="">
      <span className={styles.mode}>{modeLabel(mode, scannedAt)}</span>
      <LegendButton />
      <svg className={styles.svg} viewBox={`0 0 ${g.W} ${g.H}`} role="group" aria-label="Nine stage routes; bolts are rungs">
        <Backdrop g={g} hatchId={hatchId} rungNames={rungNames} />
        {routes.map((v) => (
          <Route key={v.stage} v={v} g={g} mode={mode} animKey={animKey} onSelect={onSelect} onPick={onPick} />
        ))}
      </svg>
    </div>
  );
}
