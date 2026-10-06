import type { CapStatus, DoctorRow, Focus } from '../types';
import { downstream, stepFrees, upstream, type Graph } from './graph';

/** The nodes lit for a hover, a pick or a lozenge filter. Everything else dims. */
export interface Hot {
  steps: Set<number>;
  tracks: Set<string>;
  caps: Set<string>;
}

/**
 * What lights up. A hover or pick wins over the lozenge filter.
 * - A track lights what it needs (tracks, steps, capabilities) and what it frees.
 * - A step lights the tracks it frees and everything behind them.
 * - A capability lights the tracks that rely on it and everything behind them.
 * - With no focus, the filter lights every capability of that status.
 * Returns null when nothing is lit (nothing dims).
 */
export function hotSets(g: Graph, focus: Focus | null, capFilter: CapStatus | null, doctor: readonly DoctorRow[]): Hot | null {
  if (!focus && !capFilter) return null;
  const h: Hot = { steps: new Set(), tracks: new Set(), caps: new Set() };
  const capHot = (c: string) => {
    h.caps.add(c);
    for (const t of g.capUses[c] ?? []) {
      h.tracks.add(t);
      for (const x of downstream(g, t)) h.tracks.add(x);
    }
  };
  if (!focus) {
    for (const r of doctor) if (r.st === capFilter) capHot(r.name);
  } else if (focus.k === 'track') {
    const u = upstream(g, focus.id);
    h.tracks.add(focus.id);
    for (const x of u.tracks) h.tracks.add(x);
    for (const x of u.steps) h.steps.add(x);
    for (const x of u.caps) h.caps.add(x);
    for (const x of downstream(g, focus.id)) h.tracks.add(x);
  } else if (focus.k === 'step') {
    h.steps.add(focus.id);
    for (const t of stepFrees(g, focus.id)) {
      h.tracks.add(t);
      for (const x of downstream(g, t)) h.tracks.add(x);
    }
  } else capHot(focus.id);
  return h;
}

export type Lit = 'hot' | 'dim' | undefined;

export function litOf(hot: Hot | null, focus: Focus): Lit {
  if (!hot) return undefined;
  const on = focus.k === 'step' ? hot.steps.has(focus.id) : focus.k === 'track' ? hot.tracks.has(focus.id) : hot.caps.has(focus.id);
  return on ? 'hot' : 'dim';
}
