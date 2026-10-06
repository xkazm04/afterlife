'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import type { TaskView } from '../model/types';

type Point = readonly [x: number, y: number];

/** Where the ties attach, in court pixels. Measured from layout (offsets), so a card mid-transition does not skew it. */
export interface Geometry {
  taskId: string;
  claims: Record<string, Point>;
  checks: Record<string, Point>;
  laneX: number;
  /** --ui-scale, so stroke widths and the "?" scale with the text-size setting. */
  scale: number;
}

const EMPTY: Geometry = { taskId: '', claims: {}, checks: {}, laneX: 0, scale: 1 };
const sameGeometry = (a: Geometry, b: Geometry) => JSON.stringify(a) === JSON.stringify(b);

function measure(court: HTMLElement, task: TaskView): Geometry {
  const scale = parseFloat(getComputedStyle(court).getPropertyValue('--ui-scale')) || 1;
  const drop = Math.round(15 * scale);
  const at = (el: HTMLElement, x: number): Point => [x, el.offsetTop + Math.min(drop, el.offsetHeight / 2)];
  const claims: Record<string, Point> = {};
  const checks: Record<string, Point> = {};
  for (const c of task.claims) {
    const el = court.querySelector<HTMLElement>(`[data-claim-card="${c.id}"]`);
    if (el) claims[c.id] = at(el, el.offsetLeft + el.offsetWidth);
  }
  for (const c of task.proof.checks) {
    const el = court.querySelector<HTMLElement>(`[data-check-card="${c.id}"]`);
    if (el) checks[c.id] = at(el, el.offsetLeft);
  }
  const lane = court.querySelector<HTMLElement>('[data-lane]');
  return { taskId: task.id, claims, checks, laneX: lane ? lane.offsetLeft + lane.offsetWidth / 2 : 0, scale };
}

/**
 * Measures where each claim and check card sits, so the court can draw its tie lines. It re-measures when the task changes
 * and whenever the court resizes (window resize, inspector toggle, text-size change). Which ties exist and how they look
 * comes from the pure model; this only supplies the coordinates.
 */
export function useTieGeometry(courtRef: RefObject<HTMLElement | null>, task: TaskView): Geometry {
  const [geo, setGeo] = useState<Geometry>(EMPTY);

  const update = useCallback(() => {
    const court = courtRef.current;
    if (!court) return;
    const next = measure(court, task);
    setGeo((prev) => (sameGeometry(prev, next) ? prev : next));
  }, [courtRef, task]);

  useLayoutEffect(() => {
    update();
  }, [update]);

  useEffect(() => {
    const court = courtRef.current;
    if (!court || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    ro.observe(court);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [courtRef, update]);

  return geo;
}
