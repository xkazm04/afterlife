import { isHumanGate, needMet } from '../flow/state';
import type { SetupState } from '../types';
import { isStepKey, stepOf, type Graph } from './graph';
import type { Hot } from './hot';

export interface Pt {
  x: number;
  y: number;
}
/** A node's left and right connection points, relative to the canvas. */
export interface NodeBox {
  l: Pt;
  r: Pt;
}
export interface Geometry {
  steps: Record<number, NodeBox>;
  tracks: Record<string, NodeBox>;
  /** Keyed by the full capability name. */
  caps: Record<string, NodeBox>;
}

export type EdgeKind = 'step' | 'dep' | 'cap';
export interface EdgeSpec {
  id: string;
  kind: EdgeKind;
  d: string;
  /** The need is met (or the capability is available). */
  met: boolean;
  /** Lit for the hover or pick. */
  hot: boolean;
  /** Lit and waiting on a gate of yours: drawn amber. */
  wait: boolean;
  /** An unknown capability: dashed. */
  unknown: boolean;
}

const f = (n: number) => Math.round(n * 10) / 10;

/** A horizontal S-curve from a's right side to b's left side. */
export function curve(a: Pt, b: Pt, scale = 1): string {
  const dx = Math.max(24 * scale, (b.x - a.x) / 2);
  return `M${f(a.x)} ${f(a.y)} C${f(a.x + dx)} ${f(a.y)} ${f(b.x - dx)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`;
}

/** Track-to-track: arcs out to the left of both tracks so it never crosses the track column. */
export function arc(a: Pt, b: Pt, scale = 1): string {
  const bend = (22 + Math.abs(b.y - a.y) * 0.08) * scale;
  return `M${f(a.x)} ${f(a.y)} C${f(a.x - bend)} ${f(a.y)} ${f(b.x - bend)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`;
}

/**
 * Every edge of the map: step to track (needs), track to track (needs), track to capability (relies on).
 * Edges whose endpoints are not measured yet are skipped.
 */
export function buildEdges(g: Graph, s: SetupState, geom: Geometry, hot: Hot | null, scale = 1): EdgeSpec[] {
  const out: EdgeSpec[] = [];
  for (const [tid, needs] of Object.entries(g.needs)) {
    const t = geom.tracks[tid];
    if (!t) continue;
    for (const k of needs) {
      const met = needMet(s, k);
      if (isStepKey(k)) {
        const n = stepOf(k);
        const sb = geom.steps[n];
        if (!sb) continue;
        const isHot = !!hot && hot.steps.has(n) && hot.tracks.has(tid);
        out.push({ id: `${k}>${tid}`, kind: 'step', d: curve(sb.r, t.l, scale), met, hot: isHot, wait: isHot && !!s.steps[n] && isHumanGate(s.steps[n]), unknown: false });
      } else {
        const kb = geom.tracks[k];
        if (!kb) continue;
        const isHot = !!hot && hot.tracks.has(k) && hot.tracks.has(tid);
        out.push({ id: `${k}>${tid}`, kind: 'dep', d: arc(kb.l, t.l, scale), met, hot: isHot, wait: false, unknown: false });
      }
    }
  }
  for (const row of s.doctor) {
    const cb = geom.caps[row.name];
    for (const tid of g.capUses[row.name] ?? []) {
      const t = geom.tracks[tid];
      if (!cb || !t) continue;
      out.push({
        id: `${tid}>${row.name}`, kind: 'cap', d: curve(t.r, cb.l, scale), met: row.st === 'available',
        hot: !!hot && hot.caps.has(row.name) && hot.tracks.has(tid), wait: false, unknown: row.st === 'unknown',
      });
    }
  }
  return out;
}
