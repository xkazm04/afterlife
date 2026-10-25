// A real project's measurements on disk: <data>/vitals/<slug>/{ci-runs,prod,adjustments}.jsonl, append-only and
// idempotent by key. Stubs with the final signatures; WP2 builds the store and the CI collector, WP4 the prod
// collector, WP5 the judge.
import type { AdjustmentLine, CiRun, DeployMarker, MeasureVerdict, ProdPoint, Sample, VariantRule } from '@/schemas/vitals';

export const vitalsDir = (slug: string): string => `${process.env.BELAY_DATA_DIR ?? '.belay'}/vitals/${slug}`;

export function readCiRuns(slug: string): CiRun[] { void slug; return []; }
/** Appends the runs whose key is not stored yet; returns how many were new. */
export function appendCiRuns(slug: string, runs: CiRun[]): number { void slug; void runs; throw new Error('vitals: appendCiRuns not built (WP2)'); }
export function readProd(slug: string): ProdPoint[] { void slug; return []; }
export function appendProd(slug: string, points: ProdPoint[]): number { void slug; void points; throw new Error('vitals: appendProd not built (WP4)'); }
export function readAdjustments(slug: string): AdjustmentLine[] { void slug; return []; }
export function appendAdjustment(slug: string, line: AdjustmentLine): void { void slug; void line; throw new Error('vitals: appendAdjustment not built (WP5)'); }

/** The first rule whose pipeline, branch glob, reason and parameter all match; undefined when none does. */
export function classifyVariant(run: CiRun, rules: VariantRule[]): string | undefined { void run; void rules; return undefined; }

export interface CollectResult { slug: string; ci: { added: number; total: number }; prod?: { added: number }; probes: import('@/schemas/vitals').ProbeResult[] }
/** Incremental: CI runs newer than the newest stored, then prod points since the newest stored bin. */
export async function collectProject(slug: string): Promise<CollectResult> { void slug; throw new Error('vitals: collectProject not built (WP2)'); }

export function deployMarkers(runs: CiRun[]): DeployMarker[] { void runs; return []; }

/** bench-delta rules over raw samples: within tolerance -> not-earned, better beyond it -> credited, n < 3 wall -> inconclusive. */
export function judge(base: number[], head: number[], direction: 'down' | 'up', tolerance?: number): { base: Sample; head: Sample; verdict: MeasureVerdict; tolerance: number; reason: string } {
  void base; void head; void direction; void tolerance;
  throw new Error('vitals: judge not built (WP5)');
}
