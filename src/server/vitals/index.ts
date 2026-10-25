// A real project's measurements on disk: <data>/vitals/<slug>/{ci-runs,prod,adjustments}.jsonl, append-only and
// idempotent by key. The store, variants, deploy markers and the CI collector live in sub-files; WP4 adds the prod
// collector, WP5 the judge.
import type { MeasureVerdict, Sample } from '@/schemas/vitals';

export { vitalsDir, readCiRuns, appendCiRuns, readProd, appendProd, readAdjustments, appendAdjustment } from './store';
export { classifyVariant } from './variants';
export { collectProject } from './collect/collect';
export { deployMarkers } from './deploys';

export interface CollectResult { slug: string; ci: { added: number; total: number }; prod?: { added: number }; probes: import('@/schemas/vitals').ProbeResult[] }

/** bench-delta rules over raw samples: within tolerance -> not-earned, better beyond it -> credited, n < 3 wall -> inconclusive. */
export function judge(base: number[], head: number[], direction: 'down' | 'up', tolerance?: number): { base: Sample; head: Sample; verdict: MeasureVerdict; tolerance: number; reason: string } {
  void base; void head; void direction; void tolerance;
  throw new Error('vitals: judge not built (WP5)');
}
