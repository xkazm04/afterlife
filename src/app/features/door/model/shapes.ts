// Path strings for a tower, a plate and a beam, in Night Shift's geometry. Windows of one tier on one tower share a
// single path, so a tower is about ten SVG nodes rather than twenty. Pure.
import type { FleetProject } from '@/lib/demo/types';
import { tiersKnown } from '@/lib/tiers';
import { FA, FB, PT, at, BEAM, needsOf, type District, type Placed, type Pt } from './city';

const f1 = (n: number) => n.toFixed(1);
export const pathD = (ps: readonly Pt[], close = false): string => 'M' + ps.map((q) => `${f1(q[0])} ${f1(q[1])}`).join(' L') + (close ? ' Z' : '');
export const points = (ps: readonly Pt[]): string => ps.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ');
const up = (q: Pt, z: number): Pt => [q[0], q[1] - z];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];

/** Six windows on one face: o is the face origin, e the face vector, h the tower height. */
function faceWindows(o: Pt, e: Pt, h: number): Pt[][] {
  const out: Pt[][] = [];
  const pitch = (h - 7) / 3;
  const wh = Math.max(1.6, pitch * 0.5);
  for (let r = 0; r < 3; r++) {
    const z2 = h - 7 - r * pitch + pitch * 0.15;
    const z1 = z2 - wh;
    for (const [c0, c1] of [
      [0.16, 0.42],
      [0.58, 0.84],
    ] as const) {
      const q = (s: number, z: number): Pt => [o[0] + e[0] * s, o[1] + e[1] * s - z];
      out.push([q(c0, z1), q(c1, z1), q(c1, z2), q(c0, z2)]);
    }
  }
  return out;
}

export interface TowerShape {
  kind: 'solid' | 'setup' | 'nsu';
  /** The pointer target. */
  hit: string;
  faces?: { l: string; r: string; top: string };
  hatch?: string;
  /** Window paths keyed by tier, by standing ("no_record", "refused"), or "null" for an unknown class. */
  windows: Record<string, string>;
  halo?: string;
  edge: string;
  poles?: string;
  /** Not set up: dashed footprint and ghost box. */
  foot?: string;
  ghost?: string;
  /** Quarantined lamps on the right face: tripwire quarantines only, none while the tiers are unknown. */
  lamps: Pt[];
}

/** One tower, drawn around its own footprint centre (0, 0); the caller translates it. */
export function towerShape(t: Placed, classes: readonly string[]): TowerShape {
  const { p, h } = t;
  const L: Pt = [-FA, 0];
  const B: Pt = [0, FB];
  const R: Pt = [FA, 0];
  const T: Pt = [0, -FB];
  if (p.state === 'not-set-up') {
    const gh = 30;
    return {
      kind: 'nsu',
      hit: points([up(L, gh), up(T, gh), up(R, gh), R, B, L]),
      windows: {},
      edge: '',
      foot: points([T, R, B, L]),
      ghost: `${pathD([L, up(L, gh), up(T, gh), up(R, gh), R])} ${pathD([B, up(B, gh)])} ${pathD([up(L, gh), up(B, gh), up(R, gh)])}`,
      lamps: [],
    };
  }
  const [Lh, Bh, Rh, Th] = [up(L, h), up(B, h), up(R, h), up(T, h)];
  if (p.state === 'setting-up') {
    return {
      kind: 'setup',
      hit: points([L, B, R, Rh, Th, Lh]),
      windows: {},
      edge: `${pathD([L, B, R])} ${pathD([L, Lh])} ${pathD([B, Bh])} ${pathD([R, Rh])} ${pathD([Lh, Bh, Rh, Th], true)} ${pathD([L, Bh])} ${pathD([B, Rh])}`,
      poles: `${pathD([Lh, up(L, h + 9)])} ${pathD([Rh, up(R, h + 9)])} ${pathD([Bh, up(B, h + 9)])}`,
      lamps: [],
    };
  }
  const windows: Record<string, string> = {};
  const wl = faceWindows(L, [B[0] - L[0], B[1] - L[1]], h);
  const wr = faceWindows(B, [R[0] - B[0], R[1] - B[1]], h);
  classes.forEach((k, i) => {
    const tier = p.classTiers?.[k] ?? 'null';
    const poly = i < 6 ? wl[i] : wr[i - 6];
    if (poly) windows[tier] = (windows[tier] ? windows[tier] + ' ' : '') + pathD(poly, true);
  });
  const q = tiersKnown(p) ? (p.tiers?.quarantined ?? 0) : 0;
  const lamps: Pt[] = Array.from({ length: q }, (_, i) => [0.5 * FA + (i - (q - 1) / 2) * 4, FB * 0.5 - h * 0.55]);
  const stale = p.state === 'stale';
  return {
    kind: 'solid',
    hit: points([L, B, R, Rh, Th, Lh]),
    faces: { l: points([L, B, Bh, Lh]), r: points([B, R, Rh, Bh]), top: points([Lh, Bh, Rh, Th]) },
    hatch: stale ? `${pathD([L, B, Bh, Lh], true)} ${pathD([B, R, Rh, Bh], true)} ${pathD([Lh, Bh, Rh, Th], true)}` : undefined,
    windows,
    halo: stale ? undefined : pathD([L, Lh, Th, Rh, R, B], true),
    edge: `${pathD([L, Lh, Th, Rh, R, B], true)} ${pathD([B, Bh])} ${pathD([Lh, Bh, Rh])}`,
    lamps,
  };
}

/** The top of a tower above its footprint (for brackets and the beam's base). */
export const towerTop = (t: Placed): number => (t.p.state === 'not-set-up' ? 30 : t.h + (t.p.state === 'setting-up' ? 12 : 0));

export interface PlateShape {
  c: Pt;
  l: string;
  r: string;
  top: string;
  cells: string;
  back: string;
  edge: string;
  ghost: string;
  spills: { x: number; y: number; rx: number; stale: boolean }[];
}

export function plateShape(d: District): PlateShape {
  const T: Pt = [0, PT];
  let cells = '';
  for (let i = 0; i < d.cols - 1; i++) cells += pathD([at(d, i + 0.5, d.v0 + 0.2), at(d, i + 0.5, d.v1 - 0.2)]) + ' ';
  for (let j = 0; j < d.rows - 1; j++) cells += pathD([at(d, d.u0 + 0.2, j + 0.5), at(d, d.u1 - 0.2, j + 0.5)]) + ' ';
  return {
    c: [(d.L[0] + d.R[0]) / 2, (d.Tp[1] + d.B[1]) / 2],
    l: points([d.L, d.B, add(d.B, T), add(d.L, T)]),
    r: points([d.B, d.R, add(d.R, T), add(d.B, T)]),
    top: points([d.Tp, d.R, d.B, d.L]),
    cells,
    back: pathD([d.L, d.Tp, d.R]),
    edge: `${pathD([d.L, d.B, d.R])} ${pathD([d.B, add(d.B, T)])}`,
    ghost: pathD([add(d.L, [0, 2]), add(d.B, [0, 2]), add(d.R, [0, 2])]),
    spills: d.placed.filter((t) => needsOf(t.p) > 0).map((t) => ({ x: t.x, y: t.y, rx: 22 + needsOf(t.p) * 6, stale: t.p.state === 'stale' })),
  };
}

export interface BeamShape {
  id: string;
  x: number;
  /** The roof the beam stands on. */
  y: number;
  H: number;
  w: number;
  stale: boolean;
}

/** Every decision is light: one beam per project that waits, 38 px per decision, back to front. */
export function beamsOf(ds: readonly District[]): BeamShape[] {
  return ds
    .flatMap((d) => d.placed)
    .filter((t) => needsOf(t.p) > 0)
    .sort((a, b) => a.y - b.y)
    .map((t) => ({ id: t.p.id, x: t.x, y: t.y - t.h, H: needsOf(t.p) * BEAM, w: FA * 1.7, stale: t.p.state === 'stale' }));
}

/** A soft amber glow in the air above each district, at the decision-weighted centre, scaled by its share. */
export function districtGlows(ds: readonly District[]): { cx: number; cy: number; rx: number; ry: number; opacity: number }[] {
  const maxN = Math.max(1, ...ds.map((d) => d.needs));
  return ds.flatMap((d) => {
    const ps = d.placed.filter((t) => needsOf(t.p) > 0);
    if (!ps.length) return [];
    const cx = ps.reduce((a, t) => a + t.x * needsOf(t.p), 0) / d.needs;
    const cy = ps.reduce((a, t) => a + (t.y - t.h) * needsOf(t.p), 0) / d.needs;
    const r = 70 + (70 * d.needs) / maxN;
    return [{ cx, cy: cy - r * 0.55, rx: r * 0.8, ry: r, opacity: 0.25 + (0.55 * d.needs) / maxN }];
  });
}

/** Corner brackets around one tower (the hover). */
export function bracketsPath(t: Placed): string {
  const top = towerTop(t);
  const [x0, x1, y0, y1, c] = [t.x - FA - 5, t.x + FA + 5, t.y - top - FB - 5, t.y + FB + 5, 5];
  return `M${x0} ${y0 + c}V${y0}H${x0 + c} M${x1 - c} ${y0}H${x1}V${y0 + c} M${x1} ${y1 - c}V${y1}H${x1 - c} M${x0 + c} ${y1}H${x0}V${y1 - c}`;
}

export const isSetupLight = (p: FleetProject): boolean => p.state === 'setting-up';
