// The beat grammar, as geometry: one stylised complex per project. The R wave's height follows armed tracks, a
// quarantined class dips the Q wave, setting-up beats are lower (and drawn dashed). Pure; components only draw it.
import type { FleetProject } from '@/lib/demo/types';
import { isLive, isQuarantined, liveNeeds } from './totals';

type Pt = readonly [number, number];

function complexPts(q: boolean): Pt[] {
  const pts: Pt[] = [[0, 0], [0.16, 0]];
  for (let i = 1; i <= 6; i++) pts.push([0.16 + 0.14 * (i / 7), 0.13 * Math.sin(Math.PI * (i / 7))]);
  pts.push([0.3, 0], [0.355, 0], [0.385, q ? -0.46 : -0.1], [0.43, 1], [0.475, -0.3], [0.515, 0], [0.59, 0]);
  for (let i = 1; i <= 9; i++) pts.push([0.59 + 0.22 * (i / 10), 0.25 * Math.sin(Math.PI * Math.pow(i / 10, 0.85))]);
  pts.push([0.81, 0], [1, 0]);
  return pts;
}
const CP = complexPts(false);
const CPQ = complexPts(true);
/** Where the R wave peaks along a beat (0..1): flags stand on it. */
export const R_AT = 0.43;

/** One slot on a lead, in px: left edge, width, baseline and the tallest the R wave may reach. */
export interface Slot {
  x: number;
  w: number;
  base: number;
  amax: number;
  /** Inset at both ends of the slot, as a fraction of its width. */
  ins: number;
}

/** R height: setting up is a low beat; a watched beat grows with its armed tracks (0..8). */
export const amplitude = (p: FleetProject, amax: number): number =>
  p.state === 'setting-up' ? amax * 0.42 : amax * (0.38 + 0.62 * (Math.max(0, p.armed) / 8));

const f1 = (n: number) => n.toFixed(1);

/** The SVG path of one beat. */
export function beatPath(s: Slot, a: number, q: boolean): string {
  const span = 1 - 2 * s.ins;
  let d = `M${f1(s.x)} ${f1(s.base)}`;
  for (const [t, y] of q ? CPQ : CP) d += ` L${f1(s.x + s.w * (s.ins + t * span))} ${f1(s.base - y * a)}`;
  return `${d} L${f1(s.x + s.w)} ${f1(s.base)}`;
}

/** The x of the R peak in a slot. */
export const peakX = (s: Slot): number => s.x + s.w * (s.ins + R_AT * (1 - 2 * s.ins));

/** The rose Q dip of a quarantined beat (drawn over the trace). */
export function qDipPath(s: Slot, a: number): string {
  const X = (t: number) => f1(s.x + s.w * (s.ins + t * (1 - 2 * s.ins)));
  return `M${X(0.352)} ${f1(s.base)} L${X(0.385)} ${f1(s.base + 0.46 * a)} L${X(0.399)} ${f1(s.base)}`;
}

/** Evenly spaced slots along a lead of `width` px. */
export function slotsAlong(n: number, width: number, base: number, amax: number, ins = 0): Slot[] {
  const w = n ? width / n : width;
  return Array.from({ length: n }, (_, i) => ({ x: i * w, w, base, amax, ins }));
}

/** The paths of a whole lead, grouped so each is one SVG element: few nodes, drawn once per size. */
export interface LeadPaths {
  live: string;
  forming: string;
  staleGhost: string;
  flat: string;
  unknown: string;
  ticks: string;
  qdips: string;
}

export function leadPaths(projects: readonly FleetProject[], slots: readonly Slot[]): LeadPaths {
  const out: LeadPaths = { live: '', forming: '', staleGhost: '', flat: '', unknown: '', ticks: '', qdips: '' };
  projects.forEach((p, i) => {
    const s = slots[i];
    if (!s) return;
    const a = amplitude(p, s.amax);
    if (p.state === 'watching') out.live += beatPath(s, a, isQuarantined(p));
    else if (p.state === 'setting-up') out.forming += beatPath(s, a, isQuarantined(p));
    else if (p.state === 'stale') {
      out.staleGhost += beatPath(s, a * 0.9, false);
      out.flat += `M${f1(s.x)} ${f1(s.base)} H${f1(s.x + s.w)}`;
    } else {
      // a dashed break with end ticks: no lead at all, never a flat zero
      const tk = Math.max(3, s.amax * 0.16);
      out.unknown += `M${f1(s.x + 3)} ${f1(s.base)} H${f1(s.x + s.w - 3)}`;
      out.ticks += `M${f1(s.x + 0.8)} ${f1(s.base - tk)} V${f1(s.base + tk)} M${f1(s.x + s.w - 0.8)} ${f1(s.base - tk)} V${f1(s.base + tk)}`;
    }
    if (isLive(p) && isQuarantined(p)) out.qdips += qDipPath(s, a);
  });
  return out;
}

/** Decision pips stacked above a beat: at most six are drawn, the count says the rest. */
export const pipCount = (p: FleetProject): number => Math.min(6, liveNeeds(p));
