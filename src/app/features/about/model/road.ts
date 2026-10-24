// The road the change travels: one station per beat, joined by a Catmull-Rom curve drawn as cubic Béziers. The film's
// camera and the travelling light need a point at a given distance along it, so the curve is sampled here (pure, no
// DOM): a beat position t (0 = the first station, n - 1 = the last, fractions between) maps to a length, a length to a point.
import { clamp, f1, lerp } from './rng';

type Pt = readonly [number, number];

/** The station heights, repeated past nine beats. */
const STATION_Y = [235, 205, 250, 215, 255, 205, 245, 215, 240] as const;
const STATION_X0 = 250;
const STATION_DX = 340;
/** Samples per Bézier segment: plenty for a smooth light at the film's zoom. */
const STEPS = 32;

export const stationX = (i: number): number => STATION_X0 + i * STATION_DX;
export const stationY = (i: number): number => STATION_Y[i % STATION_Y.length] as number;

export interface Route {
  /** The road's path data. */
  d: string;
  /** Each station's point. */
  stations: readonly Pt[];
  /** The road's whole length. */
  total: number;
  /** The length along the road at each station. */
  stationLen: readonly number[];
  /** The length along the road at beat position t (clamped to the road). */
  lenAt(t: number): number;
  /** The point at a length along the road. */
  pointAt(len: number): { x: number; y: number };
}

function cubic(p0: Pt, c1: Pt, c2: Pt, p1: Pt, u: number): Pt {
  const v = 1 - u;
  const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, e = u * u * u;
  return [a * p0[0] + b * c1[0] + c * c2[0] + e * p1[0], a * p0[1] + b * c1[1] + c * c2[1] + e * p1[1]];
}

/** The road through n stations, with a lead-in from the left and a run-out to the right. */
export function buildRoute(n: number): Route {
  const stations: Pt[] = Array.from({ length: n }, (_, i) => [stationX(i), stationY(i)] as const);
  const last = stations[n - 1] ?? [STATION_X0, STATION_Y[0]];
  const pts: Pt[] = [[-320, 245], ...stations, [last[0] + 390, 238]];
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  // The sampled polyline: lengths and points, plus where each knot (pts[k]) falls in it.
  const sx: number[] = [pts[0]![0]], sy: number[] = [pts[0]![1]], sl: number[] = [0];
  const knotLen: number[] = [0];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${p2[0]} ${p2[1]}`;
    for (let k = 1; k <= STEPS; k++) {
      const q = cubic(p1, c1, c2, p2, k / STEPS);
      const j = sx.length - 1;
      sl.push(sl[j]! + Math.hypot(q[0] - sx[j]!, q[1] - sy[j]!));
      sx.push(q[0]);
      sy.push(q[1]);
    }
    knotLen.push(sl[sl.length - 1]!);
  }
  const total = sl[sl.length - 1]!;
  const stationLen = stations.map((_, i) => knotLen[i + 1]!);

  function lenAt(t: number): number {
    if (n < 2) return stationLen[0] ?? 0;
    const first = stationLen[0]!, step0 = stationLen[1]! - first;
    const lastLen = stationLen[n - 1]!, stepN = lastLen - stationLen[n - 2]!;
    if (t <= 0) return Math.max(0, first + t * step0);
    if (t >= n - 1) return Math.min(total, lastLen + (t - (n - 1)) * stepN);
    const i = Math.floor(t);
    return lerp(stationLen[i]!, stationLen[i + 1]!, t - i);
  }

  function pointAt(len: number): { x: number; y: number } {
    const L = clamp(len, 0, total);
    let lo = 0, hi = sl.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (sl[mid]! < L) lo = mid;
      else hi = mid;
    }
    const span = sl[hi]! - sl[lo]!;
    const u = span > 0 ? (L - sl[lo]!) / span : 0;
    return { x: lerp(sx[lo]!, sx[hi]!, u), y: lerp(sy[lo]!, sy[hi]!, u) };
  }

  return { d, stations, total, stationLen, lenAt, pointAt };
}
