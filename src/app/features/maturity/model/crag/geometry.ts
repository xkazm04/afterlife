// Crag geometry. The SVG is drawn 1:1 in CSS pixels, so labels keep their size; everything is multiplied by the
// text-size scale (--ui-scale, D10), which the screen reads once and passes in.

export interface CragGeom {
  W: number;
  H: number;
  scale: number;
  /** Left gutter (rung labels) and right margin. */
  L: number;
  RGT: number;
  /** y of rung 0 (the ground line). */
  Y0: number;
  colW: number;
  yOf: (rung: number) => number;
  xOf: (col: number) => number;
  /** Alternating sideways offset so neighbouring bolts do not form a straight line; none on the ground. */
  jig: (col: number, rung: number) => number;
}

/** Fixed pixel sizes at the Smaller setting; multiply by `scale` for the others. */
export const CRAG_MIN_W = 560;
export const CRAG_MIN_H = 320;
export const STAGE_COUNT = 9;

export function cragGeom(clientW: number, clientH: number, scale: number): CragGeom {
  const W = Math.max(CRAG_MIN_W * scale, clientW);
  const H = Math.max(CRAG_MIN_H * scale, clientH);
  const L = 96 * scale;
  const RGT = 14 * scale;
  const TOP = 44 * scale;
  const Y0 = H - 56 * scale;
  const step = (Y0 - TOP) / 4;
  const colW = (W - L - RGT) / STAGE_COUNT;
  return {
    W,
    H,
    scale,
    L,
    RGT,
    Y0,
    colW,
    yOf: (r) => Y0 - r * step,
    xOf: (i) => L + (i + 0.5) * colW,
    jig: (i, r) => (r === 0 ? 0 : ((i + r) % 2 ? 1 : -1) * Math.min(8 * scale, colW * 0.07)),
  };
}

const f = (n: number): string => n.toFixed(1);

/** A hand-drawn-looking contour line across the crag at height y. */
export function wavyPath(g: CragGeom, y: number, amp: number, phase: number): string {
  const n = 12;
  const w = (g.W - g.L - g.RGT + 12 * g.scale) / n;
  const a = amp * g.scale;
  let d = `M${f(g.L - 6 * g.scale)},${f(y)}`;
  for (let k = 0; k < n; k++) {
    const x0 = g.L - 6 * g.scale + k * w;
    const c1 = `${f(x0 + w * 0.33)},${f(y + a * Math.sin(phase + k))}`;
    const c2 = `${f(x0 + w * 0.66)},${f(y - a * Math.sin(phase + k + 0.7))}`;
    const end = `${f(x0 + w)},${f(y + a * Math.sin(phase + k + 1.3) * 0.4)}`;
    d += ` C${c1} ${c2} ${end}`;
  }
  return d;
}

/** The rope of one route from rung `from` up to rung `to`; rung 0 sits just under the ground line. */
export function ropePath(g: CragGeom, col: number, from: number, to: number): string {
  const pts: string[] = [];
  for (let r = from; r <= to; r++) {
    const y = r === 0 ? g.Y0 + 14 * g.scale : g.yOf(r);
    pts.push(`${f(g.xOf(col) + g.jig(col, r))},${f(y)}`);
  }
  return `M${pts.join(' L')}`;
}

/** y of a rung's marker: rung 0 is drawn on the ground. */
export const markY = (g: CragGeom, rung: number, groundOffset: number): number => (rung === 0 ? g.Y0 + groundOffset * g.scale : g.yOf(rung));

export interface ClipBox {
  x: number;
  w: number;
}

/** The pill of a gap tag beside its ring; it flips to the left when it would run off the crag. */
export function clipBox(g: CragGeom, label: string, ringX: number): ClipBox {
  const w = Math.round(label.length * 6.7 * g.scale + 14 * g.scale);
  const gap = 12 * g.scale;
  const x = ringX + gap + w > g.W - 4 ? ringX - gap - w : ringX + gap;
  return { x, w };
}
