import { STAGES, type Stage } from '@/schemas';
import type { CragGeom } from '../../model/crag/geometry';

/** Short forms used when the full stage names would run into their neighbours under the routes. */
const SHORT: Partial<Record<Stage, string>> = { configure: 'config' };
/** Average glyph advance of the 600-weight label face, in em (measured 0.52 to 0.58 across the stage names). */
const ADVANCE = 0.58;
/** The .slab font size at Smaller; multiplied by the scale like everything else. */
const FONT = 12;

export interface LabelFit {
  /** Use the short forms (the full name stays in a <title>). */
  short: boolean;
  /** Font-size factor, 1 = the .slab size. */
  size: number;
}

const longest = (names: readonly string[]): number => Math.max(...names.map((n) => n.length));

/**
 * One fit for every stage label, from the column width alone, so the labels stay one size: shrink a little if the
 * longest name nearly fits, otherwise switch to the short forms (and shrink those if they still need it).
 */
export function labelFit(g: CragGeom): LabelFit {
  const room = g.colW - 6 * g.scale; // the column rect's inset
  const per = ADVANCE * FONT * g.scale;
  const full = longest(STAGES) * per;
  if (full * 0.92 <= room) return { short: false, size: Math.min(1, room / full) };
  const short = longest(STAGES.map((s) => SHORT[s] ?? s)) * per;
  return { short: true, size: Math.max(0.75, Math.min(1, room / short)) };
}

export const stageLabel = (stage: Stage, fit: LabelFit): string => (fit.short ? (SHORT[stage] ?? stage) : stage);
