// The camera over the 1600 x 1000 stage: where it looks (cx, cy), where that point lands (X, Y), and the zoom k. The
// screen turns it into CSS transforms the compositor animates, instead of rewriting SVG attributes every frame. Pure.
import { FA, FB, PT, type District, type Placed } from './city';

export interface Cam {
  cx: number;
  cy: number;
  X: number;
  Y: number;
  k: number;
}

export const HOME: Cam = { cx: 800, cy: 500, X: 800, Y: 500, k: 1 };

/** Frame one district on the left two-thirds, leaving the rail its room on the right. */
export function frameDistrict(d: District): Cam {
  let minY = Infinity;
  for (const t of d.placed) minY = Math.min(minY, t.y - FB - (t.p.state === 'not-set-up' ? 30 : t.h + 12));
  const [x0, x1] = [d.L[0], d.R[0]];
  const [y0, y1] = [Math.min(minY, d.Tp[1]), d.B[1] + PT];
  const k = Math.min(940 / (x1 - x0), 560 / (y1 - y0), 3);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, X: 566, Y: 628, k };
}

/** Push in on one tower: the city falls away behind the project's cutaway. */
export function frameTower(d: District, t: Placed): Cam {
  return { cx: t.x, cy: t.y - t.h / 2, X: 300, Y: 600, k: frameDistrict(d).k * 1.7 };
}

/** The city layer's CSS transform (origin 0 0). */
export function cityTransform(c: Cam): string {
  return `translate(${(c.X - c.k * c.cx).toFixed(2)}px, ${(c.Y - c.k * c.cy).toFixed(2)}px) scale(${c.k.toFixed(4)})`;
}

/** The ground moves at half the camera's travel and zoom: the parallax that keeps the city floating over it. */
export function groundTransform(c: Cam): string {
  const f = 0.5;
  const kg = 1 + (c.k - 1) * f;
  return `translate(${((c.X - c.k * c.cx) * f).toFixed(2)}px, ${((c.Y - c.k * c.cy) * f).toFixed(2)}px) scale(${kg.toFixed(4)})`;
}

/** Where a tower's footprint is on the stage under a camera, and how big its 30 px footprint looks. */
export function onStage(c: Cam, t: Placed): { x: number; y: number; k0: number } {
  return { x: c.X - c.k * c.cx + c.k * t.x, y: c.Y - c.k * c.cy + c.k * t.y, k0: Math.max(0.05, (FA * c.k) / 118) };
}
