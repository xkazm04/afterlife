// A real project's measurements on disk: <data>/vitals/<slug>/ci-runs.jsonl, prod.jsonl and adjustments.jsonl.
// Runs and prod points are idempotent by `key`; adjustment lines are appended as they come.
import { join } from 'node:path';
import type { AdjustmentLine, CiRun, ProdPoint } from '@/schemas/vitals';
import { appendKeyed, appendRow, readJsonl } from './jsonl';

export const vitalsDir = (slug: string): string => `${process.env.BELAY_DATA_DIR ?? '.belay'}/vitals/${slug}`;

export const VITALS_FILES = { ci: 'ci-runs.jsonl', prod: 'prod.jsonl', adjustments: 'adjustments.jsonl' } as const;
const file = (slug: string, f: keyof typeof VITALS_FILES): string => join(vitalsDir(slug), VITALS_FILES[f]);

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => v !== null && typeof v === 'object' && !Array.isArray(v);
const s = (v: unknown): boolean => typeof v === 'string';

/** The row checks: enough to trust the fields every reader uses, not a full schema. */
export const isCiRun = (v: unknown): v is CiRun =>
  isRec(v) && s(v.key) && s(v.runId) && s(v.pipelineId) && s(v.result) && s(v.startedAt) && Array.isArray(v.stages);
export const isProdPoint = (v: unknown): v is ProdPoint =>
  isRec(v) && s(v.key) && s(v.signal) && s(v.binStart) && typeof v.value === 'number' && typeof v.n === 'number';
export const isAdjustment = (v: unknown): v is AdjustmentLine => isRec(v) && (v.type === 'claim' || v.type === 'measurement') && s(v.id) && s(v.at);

/** Rows plus the count of lines that did not parse, for a screen that says "3 lines unreadable". */
export function readVitals(slug: string, f: keyof typeof VITALS_FILES): { rows: unknown[]; skipped: number } {
  const valid: (v: unknown) => v is unknown = f === 'ci' ? isCiRun : f === 'prod' ? isProdPoint : isAdjustment;
  return readJsonl(file(slug, f), valid);
}

export function readCiRuns(slug: string): CiRun[] { return readJsonl(file(slug, 'ci'), isCiRun).rows; }
/** Appends the runs whose key is not stored yet; returns how many were new. */
export function appendCiRuns(slug: string, runs: CiRun[]): number { return appendKeyed(file(slug, 'ci'), runs, isCiRun); }
export function readProd(slug: string): ProdPoint[] { return readJsonl(file(slug, 'prod'), isProdPoint).rows; }
export function appendProd(slug: string, points: ProdPoint[]): number { return appendKeyed(file(slug, 'prod'), points, isProdPoint); }
export function readAdjustments(slug: string): AdjustmentLine[] { return readJsonl(file(slug, 'adjustments'), isAdjustment).rows; }
export function appendAdjustment(slug: string, line: AdjustmentLine): void { appendRow(file(slug, 'adjustments'), line); }
