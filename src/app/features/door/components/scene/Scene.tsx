'use client';

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { cityTransform, groundTransform, type Cam } from '../../model/camera';
import { HZ, PT, depthOrder, type District as D, type Placed } from '../../model/city';
import { Beams, HoverMarks, SetupLights } from './Beams';
import { District } from './District';
import { Ground, Pulses } from './Ground';
import styles from './scene.module.css';

export interface SceneProps {
  ds: readonly D[];
  classes: readonly string[];
  level: 0 | 1 | 2;
  curG: number | null;
  hotG: number | null;
  hotTower: Placed | null;
  dim: ReadonlySet<string> | null;
  cam: Cam;
  camMs: number;
  onHover: (gi: number | null, id: string | null) => void;
  onPick: (gi: number | null, id: string | null) => void;
}

/** The target under the pointer or the focus: a tower (data-p) inside a district (data-g on its plate, or the layer). */
function target(e: { target: EventTarget }): { gi: number | null; id: string | null } {
  const el = (e.target as Element).closest?.('[data-p],[data-g],[data-layer]');
  if (!el) return { gi: null, id: null };
  const layer = el.closest('[data-layer]');
  return { gi: layer ? Number(layer.getAttribute('data-layer')) : null, id: el.getAttribute('data-p') };
}

/**
 * The city: ground (with parallax), seven district layers, the beams, the setup lights and the hover marks. The camera
 * is a CSS transform on two wrappers, transitioned by the compositor. Nothing in here animates inside a drawing.
 */
export function Scene(p: SceneProps) {
  // pointerover can fire many times a frame while sweeping the city: report only the last target, once per frame
  const pending = useRef<{ gi: number | null; id: string | null } | null>(null);
  const raf = useRef(0);
  const report = (t: { gi: number | null; id: string | null }) => {
    pending.current = t;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (pending.current) p.onHover(pending.current.gi, pending.current.id);
    });
  };
  const order = depthOrder(p.ds);
  const backY = order[0]?.cy;
  const backN = order.filter((d) => d.cy === backY).length;
  const backB = Math.max(...order.slice(0, backN).map((d) => d.B[1])) + PT;
  const vars = { '--cam-ms': `${p.camMs}ms` } as CSSProperties;

  const layer = (d: D, i: number) => {
    const cls = [styles.district, p.level >= 1 && d.gi !== p.curG ? styles.far : '', p.level === 0 && p.hotG != null && p.hotG !== d.gi ? styles.cold : '']
      .filter(Boolean)
      .join(' ');
    return (
      <div key={d.gi} className={cls} data-layer={d.gi} style={{ '--i': i } as CSSProperties}>
        <District d={d} classes={p.classes} dim={p.dim} open={p.level >= 1 && d.gi === p.curG} tabbable={p.level === 1 && d.gi === p.curG} />
      </div>
    );
  };

  return (
    <div
      className={styles.scene}
      style={vars}
      onPointerOver={(e: PointerEvent) => report(target(e))}
      onPointerLeave={() => report({ gi: null, id: null })}
      onClick={(e) => {
        const t = target(e);
        if (t.gi != null || t.id) p.onPick(t.gi, t.id);
      }}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const t = target(e);
        if (t.id) {
          e.preventDefault();
          p.onPick(t.gi, t.id);
        }
      }}
      onFocus={(e) => {
        const t = target(e);
        if (t.id) p.onHover(t.gi, t.id);
      }}
    >
      <div className={styles.ground} style={{ transform: groundTransform(p.cam) }}>
        <div className={styles.layer}>
          <Ground />
        </div>
        <div className={styles.layer}>
          <Pulses />
        </div>
      </div>
      <div className={styles.cam} style={{ transform: cityTransform(p.cam) }}>
        {order.slice(0, backN).map(layer)}
        <svg className={styles.haze} width="1600" height="1000" viewBox="0 0 1600 1000" aria-hidden>
          <rect x="-4000" y={HZ} width="10000" height={Math.round(backB - HZ + 30)} fill="url(#d-rowhaze)" />
        </svg>
        {order.slice(backN).map((d, i) => layer(d, i + backN))}
        <div className={styles.beams}>
          <div className={styles.breathe} data-ambient="city">
            <Beams ds={p.ds} dim={p.dim} />
          </div>
        </div>
        <div className={styles.layer}>
          <SetupLights ds={p.ds} />
        </div>
        <div className={styles.layer}>
          <HoverMarks hot={p.level === 0 && p.hotG != null ? (p.ds[p.hotG] ?? null) : null} tower={p.hotTower} />
        </div>
      </div>
    </div>
  );
}
