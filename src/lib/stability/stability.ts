// How stable a project's agent MRs are over the last 7 days: how many, their median size, how often their head pipeline
// went red, how many were reverted. Folded from the facts the poller stores on each task (poller/mrFacts); pure and
// client-safe, so the server's view and the screens' group sums read the same arithmetic. null = unknown, never 0.
import { plural } from '@/lib/format/plural';

/** An MR's head pipeline as the poller maps it: a final status, or still running. Anything else is unknown (null). */
export type PipelineState = 'success' | 'failed' | 'canceled' | 'running';

/** A final pipeline status: the only ones the poller caches, and the only ones the red rate counts. */
export const isFinal = (p: PipelineState | null | undefined): p is Exclude<PipelineState, 'running'> => p === 'success' || p === 'failed' || p === 'canceled';

/** One agent MR's facts, as its task row stores them. */
export interface MrFact {
  /** Lines added + removed over the MR's diffs; null: not read. */
  size: number | null;
  pipeline: PipelineState | null;
  reverted: boolean;
}

/** A project's agent-MR stability over the window. */
export interface Stability {
  n: number;
  /** Over the MRs whose size was read; null when none was. */
  medianSize: number | null;
  /** failed / finals; null when no MR has a final pipeline. */
  redRate: number | null;
  failed: number;
  finals: number;
  reverts: number;
}

/** The median of a list; null for an empty one. */
export function median(xs: readonly number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** One project's stability from its agent MRs' facts. */
export function foldStability(facts: readonly MrFact[]): Stability {
  const finals = facts.filter((f) => isFinal(f.pipeline));
  const failed = finals.filter((f) => f.pipeline === 'failed').length;
  return {
    n: facts.length,
    medianSize: median(facts.flatMap((f) => (f.size === null ? [] : [f.size]))),
    redRate: finals.length ? failed / finals.length : null,
    failed,
    finals: finals.length,
    reverts: facts.filter((f) => f.reverted).length,
  };
}

/** A group's red pipelines: failed and finals summed over the projects read. null when none of them was read. */
export function groupRed(list: readonly (Stability | undefined)[]): { failed: number; finals: number; redRate: number | null; read: number } | null {
  const read = list.filter((s): s is Stability => s !== undefined);
  if (!read.length) return null;
  const failed = read.reduce((n, s) => n + s.failed, 0);
  const finals = read.reduce((n, s) => n + s.finals, 0);
  return { failed, finals, redRate: finals ? failed / finals : null, read: read.length };
}

/** "17%": a rate as a whole percent. */
export const percent = (r: number): string => `${Math.round(r * 100)}%`;

/** One line for a card or a readout: the count, median size, red pipelines with their n, reverts. Unknown says so. */
export function stabilityLine(s: Stability): string {
  if (s.n === 0) return 'no agent MRs in 7 d';
  const size = s.medianSize === null ? 'median size unknown' : `median size ${Math.round(s.medianSize)} lines`;
  const red = s.redRate === null ? 'red pipelines: none final yet' : `red pipelines ${percent(s.redRate)} (${s.failed} of ${s.finals})`;
  return `${plural(s.n, 'agent MR')} in 7 d · ${size} · ${red} · reverts ${s.reverts}`;
}
