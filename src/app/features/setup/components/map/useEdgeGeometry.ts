'use client';

import { useEffect, useState, type RefObject } from 'react';
import type { Geometry, NodeBox } from '../../model/map/edges';

export interface Measured {
  geom: Geometry;
  /** The text-size scale (--ui-scale) the curves' handles are multiplied by. */
  scale: number;
}

const same = (a: Measured | null, b: Measured) => !!a && a.scale === b.scale && JSON.stringify(a.geom) === JSON.stringify(b.geom);

function measure(cv: HTMLElement): Measured {
  const box = cv.getBoundingClientRect();
  const geom: Geometry = { steps: {}, tracks: {}, caps: {} };
  cv.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => {
    const key = el.dataset.node ?? '';
    const i = key.indexOf(':');
    const id = key.slice(i + 1);
    const r = el.getBoundingClientRect();
    const y = r.top + r.height / 2 - box.top;
    const nb: NodeBox = { l: { x: r.left - box.left, y }, r: { x: r.right - box.left, y } };
    const k = key.slice(0, i);
    if (k === 'step') geom.steps[Number(id)] = nb;
    else if (k === 'track') geom.tracks[id] = nb;
    else if (k === 'cap') geom.caps[id] = nb;
  });
  return { geom, scale: parseFloat(getComputedStyle(cv).getPropertyValue('--ui-scale')) || 1 };
}

/**
 * Measures every `[data-node]` inside the canvas (their left and right middle points, relative to it) so the edge
 * layer can draw between them. It measures when the canvas or any node changes size (which covers the window, the
 * pane, the text-size setting and late fonts) and on window resize. Nothing is stored unless a point moved.
 */
export function useEdgeGeometry(canvas: RefObject<HTMLElement | null>): Measured | null {
  const [m, setM] = useState<Measured | null>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const run = () => {
      const next = measure(cv);
      setM((prev) => (same(prev, next) ? prev : next));
    };
    const ro = new ResizeObserver(run);
    ro.observe(cv);
    cv.querySelectorAll('[data-node]').forEach((el) => ro.observe(el));
    window.addEventListener('resize', run);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [canvas]);

  return m;
}
