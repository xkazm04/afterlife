// The city's layout, from the contest winner "Night Shift": a 2:1 isometric lattice, one district plate per group
// (four on the front row, three on the back), one tower per project, decisions as amber beams. Pure.
import type { FleetProject } from '@/lib/demo/types';

/** Lattice half-width/height, plate margin and thickness, tower footprint, horizon, beam px per decision. */
export const HW = 23;
export const HH = 11.5;
export const M = 0.45;
export const PT = 12;
export const FA = 15;
export const FB = 7.5;
export const HZ = 330;
export const BEAM = 38;
const FRONT_Y = 748;
const BACK_Y = 486;
const GAP = 26;

export type Pt = readonly [number, number];
export const proj = (u: number, v: number): Pt => [(u - v) * HW, (u + v) * HH];
/** A tower grows with its armed tracks: 11 px bare, 55.8 px with all eight. */
export const towerH = (p: FleetProject): number => 11 + (p.armed || 0) * 5.6;
/** Decisions that count: an unwatched project has no live count. */
export const needsOf = (p: FleetProject): number => (p.state === 'not-set-up' ? 0 : p.needsYou);

function snap(x: number, y: number): Pt {
  const u = Math.round((x / HW + y / HH) / 2);
  const v = Math.round((y / HH - x / HW) / 2);
  return proj(u, v);
}

export interface Placed {
  p: FleetProject;
  /** Lattice cell, screen position of the footprint centre, tower height, district index. */
  i: number;
  j: number;
  x: number;
  y: number;
  h: number;
  gi: number;
}

export interface District {
  name: string;
  gi: number;
  /** Projects in reading order: most decisions first, then state, then name. */
  placed: Placed[];
  cols: number;
  rows: number;
  n: number;
  needs: number;
  needP: number;
  stale: number;
  setup: number;
  nsu: number;
  quar: number;
  /** Plate width, centre, lattice origin, and its four corners (top, right, bottom, left). */
  w: number;
  cx: number;
  cy: number;
  ox: number;
  oy: number;
  Tp: Pt;
  R: Pt;
  B: Pt;
  L: Pt;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export const at = (d: Pick<District, 'ox' | 'oy'>, u: number, v: number): Pt => {
  const q = proj(u, v);
  return [d.ox + q[0], d.oy + q[1]];
};

const STATE_ORDER: Record<FleetProject['state'], number> = { watching: 0, stale: 1, 'setting-up': 2, 'not-set-up': 3 };

/** The districts with every tower placed: front row right-aligned, back row between its neighbours, snapped. */
export function districtsOf(groups: readonly string[], projects: readonly FleetProject[]): District[] {
  const ds: District[] = groups.map((name, gi) => {
    const ps = projects
      .filter((p) => p.group === name)
      .sort((a, b) => needsOf(b) - needsOf(a) || STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.name.localeCompare(b.name));
    const cols = Math.ceil(Math.sqrt(ps.length)) || 1;
    const rows = Math.ceil(ps.length / cols) || 1;
    const sum = (f: (p: FleetProject) => number) => ps.reduce((a, p) => a + f(p), 0);
    return {
      name,
      gi,
      placed: ps.map((p) => ({ p, i: 0, j: 0, x: 0, y: 0, h: towerH(p), gi })),
      cols,
      rows,
      n: ps.length,
      needs: sum(needsOf),
      needP: ps.filter((p) => needsOf(p) > 0).length,
      stale: ps.filter((p) => p.state === 'stale').length,
      setup: ps.filter((p) => p.state === 'setting-up').length,
      nsu: ps.filter((p) => p.state === 'not-set-up').length,
      quar: sum((p) => (p.state !== 'not-set-up' ? (p.tiers?.quarantined ?? 0) : 0)),
      w: (cols + rows + 4 * M) * HW,
      cx: 0,
      cy: 0,
      ox: 0,
      oy: 0,
      Tp: [0, 0],
      R: [0, 0],
      B: [0, 0],
      L: [0, 0],
      u0: 0,
      u1: 0,
      v0: 0,
      v1: 0,
    };
  });
  const fronts = ds.filter((_, i) => i % 2 === 0);
  let x = 1562 - (fronts.reduce((a, d) => a + d.w, 0) + GAP * (fronts.length - 1));
  for (const d of fronts) {
    d.cx = x + d.w / 2;
    d.cy = FRONT_Y;
    x += d.w + GAP;
  }
  ds.forEach((d, i) => {
    if (i % 2 === 0) return;
    const a = ds[i - 1]!;
    const b = ds[i + 1] ?? a;
    d.cx = (a.cx + b.cx) / 2;
    d.cy = BACK_Y;
  });
  for (const d of ds) place(d);
  return ds;
}

function place(d: District): void {
  const c = proj((d.cols - 1) / 2, (d.rows - 1) / 2);
  [d.ox, d.oy] = snap(d.cx - c[0], d.cy - c[1]);
  d.u0 = -0.5 - M;
  d.u1 = d.cols - 0.5 + M;
  d.v0 = -0.5 - M;
  d.v1 = d.rows - 0.5 + M;
  d.Tp = at(d, d.u0, d.v0);
  d.R = at(d, d.u1, d.v0);
  d.B = at(d, d.u1, d.v1);
  d.L = at(d, d.u0, d.v1);
  // cells front first, then nearest the front axis: the amber light clusters at the front centre
  const cells: [number, number][] = [];
  for (let i = 0; i < d.cols; i++) for (let j = 0; j < d.rows; j++) cells.push([i, j]);
  const axis = d.cols - d.rows;
  cells.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || Math.abs(a[0] - a[1] - axis) - Math.abs(b[0] - b[1] - axis) || a[0] - b[0]);
  d.placed.forEach((t, k) => {
    const cell = cells[k]!;
    const s = at(d, cell[0], cell[1]);
    t.i = cell[0];
    t.j = cell[1];
    t.x = s[0];
    t.y = s[1];
  });
}

/** Painter's order for one district: back to front. */
export const paintOrder = (d: District): Placed[] => d.placed.slice().sort((a, b) => a.i + a.j - (b.i + b.j) || a.i - a.j - (b.i - b.j));

/** Back-row districts first, so the front row paints over them. */
export const depthOrder = (ds: readonly District[]): District[] => ds.slice().sort((a, b) => a.cy - b.cy);
