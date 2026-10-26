// The wire's pure parts: what a key does on the tab list, how each segment between two nodes reads, where each place's
// band starts and ends, and the order in which newly lit segments sweep (one after another, as their events land).
import type { StepView } from '../../model/view';

/** A key on the wire: move to a node, open the selected node's drawer, or close it. */
export type WireMove = { to: number } | 'open' | 'close' | null;

/** ← ↑ / → ↓ step and stop at the ends, Home / End jump; Enter opens (Space stays the button's own click), Esc closes. */
export function keyOf(key: string, i: number, n: number): WireMove {
  const clamp = (x: number) => ({ to: Math.max(0, Math.min(n - 1, x)) });
  if (key === 'ArrowRight' || key === 'ArrowDown') return clamp(i + 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') return clamp(i - 1);
  if (key === 'Home') return clamp(0);
  if (key === 'End') return clamp(n - 1);
  if (key === 'Enter') return 'open';
  if (key === 'Escape') return 'close';
  return null;
}

/** The segment into node i: lit once both ends are done, flowing while node i checks, else idle (dashed, muted). */
export type Seg = 'lit' | 'flow' | 'idle';

export function segOf(steps: readonly StepView[], i: number): Seg {
  const s = steps[i];
  if (!s || i === 0) return 'idle';
  if (s.state === 'checking') return 'flow';
  return s.state === 'done' && steps[i - 1]?.state === 'done' ? 'lit' : 'idle';
}

/** Where node i sits in its place's band: the first carries the place's label, the last closes the band. */
export function bandOf(steps: readonly StepView[], i: number): { first: boolean; last: boolean } {
  const p = steps[i]?.place;
  return { first: steps[i - 1]?.place !== p, last: steps[i + 1]?.place !== p };
}

/**
 * Each segment's place in the sweep: segments lit now that were not lit before take 0, 1, 2… left to right (their
 * glow starts one after another); a segment already lit keeps 0 (its sweep is over). On the first render every lit one is new.
 */
export function litRanks(before: readonly boolean[] | null, now: readonly boolean[]): number[] {
  let r = 0;
  return now.map((lit, i) => (lit && !before?.[i] ? r++ : 0));
}
