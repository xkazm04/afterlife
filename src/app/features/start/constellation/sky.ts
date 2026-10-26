// Constellation's geometry, pure: one coordinate space (SKY) shared by the SVG lines and the HTML nodes placed in
// percent, so the stage can change aspect at a narrow width and every node stays on the end of its link.
import type { StepKey, StepState } from '../model/types';
import type { Place, StepView } from '../model/view';

/** The stage's units: its size, the centre (this machine), the orbit's radii. */
export const SKY = { w: 1000, h: 640, cx: 500, cy: 320, rx: 372, ry: 236 } as const;

export interface Spot {
  x: number;
  y: number;
}

/** A node on the orbit: its step, where it sits (SKY units and percent), and its place group's index. */
export interface Star {
  step: StepView;
  at: Spot;
  pct: Spot;
  group: number;
  /** Degrees on the orbit (0 = east, 90 = south). */
  angle: number;
}

/** The empty slot between two places, as a fraction of one node's slot, so the three groups read apart. */
const GAP = 0.7;
/** The first node sits just past twelve o'clock; the rest follow clockwise (SVG y points down). */
const FROM = -90;

const round = (n: number) => Math.round(n * 1000) / 1000;
const PLACES: readonly Place[] = ['this machine', 'GitLab', 'Afterlife'];

export const percentOf = (s: Spot): Spot => ({ x: round((s.x / SKY.w) * 100), y: round((s.y / SKY.h) * 100) });

function onOrbit(degrees: number, scale = 1): Spot {
  const r = (degrees * Math.PI) / 180;
  return { x: Math.round(SKY.cx + SKY.rx * scale * Math.cos(r)), y: Math.round(SKY.cy + SKY.ry * scale * Math.sin(r)) };
}

/** Each step's star, in step order clockwise, a gap between the places it moves through (this machine, GitLab, Afterlife). */
export function starsOf(steps: readonly StepView[]): Star[] {
  const groupOf = (s: StepView) => Math.max(0, PLACES.indexOf(s.place));
  const gaps = new Set(steps.map(groupOf)).size;
  const slot = 360 / (steps.length + gaps * GAP);
  let seen = -1;
  let offset = 0;
  return steps.map((step, i) => {
    const group = groupOf(step);
    if (group !== seen) {
      if (seen !== -1) offset += GAP;
      seen = group;
    }
    const angle = FROM + (i + offset + 0.5 + GAP / 2) * slot;
    const at = onOrbit(angle);
    return { step, at, pct: percentOf(at), group, angle };
  });
}

/** Where a place's label sits: inside the orbit, at the middle of its group's arc, clear of the nodes' titles. */
export function placeLabels(stars: readonly Star[]): { place: Place; pct: Spot }[] {
  return [...new Set(stars.map((s) => s.group))].map((g) => {
    const mine = stars.filter((s) => s.group === g);
    const angle = mine.reduce((a, s) => a + s.angle, 0) / mine.length;
    return { place: mine[0]!.step.place, pct: percentOf(onOrbit(angle, 0.62)) };
  });
}

/**
 * The orbit's arc from one step to the next, clockwise along the ellipse. `lit` once both ends are done, so the shape
 * builds up as steps connect; the last arc closes the ring back to the first and lights only when every step is done.
 */
export interface Bond {
  key: string;
  d: string;
  lit: boolean;
  closing: boolean;
}

export function bondsOf(stars: readonly Star[]): Bond[] {
  return stars.map((a, i) => {
    const closing = i === stars.length - 1;
    const b = stars[closing ? 0 : i + 1]!;
    const sweep = (b.angle - a.angle + 360) % 360;
    const lit = closing ? stars.every((s) => s.step.state === 'done') : a.step.state === 'done' && b.step.state === 'done';
    const d = `M ${a.at.x} ${a.at.y} A ${SKY.rx} ${SKY.ry} 0 ${sweep > 180 ? 1 : 0} 1 ${b.at.x} ${b.at.y}`;
    return { key: `${a.step.key}-${b.step.key}`, d, lit, closing };
  });
}

/** Every step done: the ring is closed and the whole picture completes. */
export const completeOf = (stars: readonly Star[]): boolean => stars.length > 0 && stars.every((s) => s.step.state === 'done');

/** A link's look, by its step's state: flowing while checking, solid when done, broken when blocked, amber for you. */
export type LinkKind = 'flow' | 'solid' | 'muted' | 'broken' | 'you';
const LINK: Record<StepState, LinkKind> = { checking: 'flow', done: 'solid', todo: 'muted', blocked: 'broken', you: 'you' };
export const linkOf = (s: StepState): LinkKind => LINK[s];

/** The state in words for a node's accessible name (never by colour alone). */
const SAID: Record<StepState, string> = { done: 'done', checking: 'checking now', blocked: 'blocked', todo: 'not reached', you: 'waits for you' };
export const nameOf = (s: StepView, n: number, of: number): string => `${n} of ${of}, ${s.title}: ${SAID[s.state]}`;

/** Arrow keys walk the orbit clockwise (Right, Down) or back (Left, Up), wrapping; Home and End jump to its ends. */
export function moveOf(keys: readonly StepKey[], at: StepKey, key: string): StepKey | null {
  const i = keys.indexOf(at);
  const n = keys.length;
  if (i < 0 || !n) return null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return keys[(i + 1) % n]!;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return keys[(i - 1 + n) % n]!;
  if (key === 'Home') return keys[0]!;
  if (key === 'End') return keys[n - 1]!;
  return null;
}
