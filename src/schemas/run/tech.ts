// A technology metric: how the runner's frontier measures a repo on a wave's base and tip (runner/tech), and how
// Afterlife re-measures a local adjustment. Lives in schemas so the app and the runner share one shape.

/** How a technology metric reads its value off a run (Ascent's /infinite SKILL.md, T3 measurement). */
export type TechParse =
  | { kind: 'wall'; unit?: string }
  | { kind: 'json-sum'; file: string; field: string; scale?: number; unit?: string }
  | { kind: 'regex'; pattern: string; unit?: string };

export interface TechMetric {
  name: string;
  /** Run in the measurement worktree; null reads what an earlier metric's command left (bundle stats after a build). */
  command: string | null;
  parse: TechParse;
  direction: 'up' | 'down';
  /** The gain (a fraction, 0.1 = 10%) that counts as a breakthrough, and the spread at which a metric is noisy. */
  threshold: number;
  /** The command's ceiling, minutes; default 20. */
  timeoutMin?: number;
}
