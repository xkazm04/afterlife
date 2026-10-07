'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { CX, CY, cutawayOf } from '../../model/cutaway';
import { TierLetter } from '../ui/TierLetter';
import { L2Panel, type Deep } from './L2Panel';
import { L2Tower } from './L2Tower';
import styles from './l2panel.module.css';
import view from './l2view.module.css';

/**
 * L2: the project lifted out of the city. The cutaway grows from where its tower stood (one CSS transform transition),
 * the class list sits beside it, the panel on the right. Pings on the antenna are two composited rings.
 */
export function L2View({
  p,
  group,
  classes,
  stages,
  deep,
  from,
}: {
  p: FleetProject;
  group: string;
  classes: readonly string[];
  stages: readonly string[];
  deep: Deep;
  /** The tower's footprint on the stage before the lift: where the cutaway starts. */
  from: { x: number; y: number; k0: number };
}) {
  const c = useMemo(() => cutawayOf(p, classes, stages), [p, classes, stages]);
  const [lifted, setLifted] = useState(false);
  const [hotClass, setHotClass] = useState<number | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setLifted(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const start = `translate(${(from.x - from.k0 * CX).toFixed(1)}px, ${(from.y - from.k0 * CY).toFixed(1)}px) scale(${from.k0.toFixed(4)})`;
  return (
    <section className={view.l2} aria-label={`Project ${p.name}`}>
      <div className={view.lift} style={{ transform: lifted ? 'none' : start }}>
        <L2Tower c={c} hotClass={hotClass} onClass={setHotClass} />
        {c.mast.live ? (
          <div className={view.pings} style={{ left: c.mast.tip[0], top: c.mast.tip[1] }} aria-hidden>
            <i data-ambient="detail" />
            <i data-ambient="detail" />
          </div>
        ) : null}
      </div>
      <div className={styles.classes}>
        <h3>Action classes</h3>
        {classes.map((k, i) => {
          const t = p.state === 'not-set-up' ? null : (p.classTiers?.[k] ?? null);
          return (
            <div key={k} className={`${styles.cl} ${t ? '' : styles.unk} ${hotClass === i ? styles.on : ''}`} onPointerEnter={() => setHotClass(i)} onPointerLeave={() => setHotClass(null)}>
              <TierLetter tier={t} holders={p.state === 'not-set-up' ? undefined : p.holders?.[k]} />
              {k}
            </div>
          );
        })}
      </div>
      {/* the panel mounts a frame after the cutaway starts to lift: two light frames instead of one heavy one (it fades
          in after 200 ms anyway) */}
      {lifted ? <L2Panel p={p} group={group} classes={classes} deep={deep} /> : null}
    </section>
  );
}
