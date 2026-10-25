// Queued re-measure. The queue-runs write (server/actions/vitals) queues N runs of the change's branch as the person
// and records their ids here, in <data>/vitals/<slug>/queued.jsonl as {claimId, runIds, at}; it is not an adjustment
// line, so the adjustments contract stays as it is. Nothing here runs anything: once a collect has stored every queued
// run, the comparison is over exactly those run ids (head) against the claim's variant's last N runs before them (base),
// and one Measurement with method 'queued' is appended per queued batch.
import { join } from 'node:path';
import type { AdjustmentClaim, Measurement, VariantRule } from '@/schemas/vitals';
import { loadProjects } from '@/server/discover';
import { appendRow, readJsonl } from '../store/jsonl';
import { appendAdjustment, readAdjustments, readCiRuns, vitalsDir } from '../store';
import { claimOf, measurementOf, type MeasureAnswer } from './passive';
import { chronological, isCiClaim, valueOf, variantRuns } from './samples';

export interface QueuedBatch {
  claimId: string;
  runIds: string[];
  at: string;
}

const file = (slug: string): string => join(vitalsDir(slug), 'queued.jsonl');
const isBatch = (v: unknown): v is QueuedBatch => {
  const o = v as Partial<QueuedBatch> | null;
  return !!o && typeof o.claimId === 'string' && typeof o.at === 'string' && Array.isArray(o.runIds) && o.runIds.every((x) => typeof x === 'string');
};

export function readQueued(slug: string): QueuedBatch[] {
  return readJsonl(file(slug), isBatch).rows;
}

export function appendQueued(slug: string, batch: QueuedBatch): void {
  appendRow(file(slug), batch);
}

/** A queued measurement already appended for this batch (one taken after the batch was queued). */
const measuredFor = (slug: string, b: QueuedBatch): Measurement | undefined =>
  readAdjustments(slug).find((l): l is Measurement => l.type === 'measurement' && l.method === 'queued' && l.id === b.claimId && Date.parse(l.at) >= Date.parse(b.at));

export function queuedMeasureWith(slug: string, claim: AdjustmentClaim, batch: QueuedBatch, now: Date, rules?: readonly VariantRule[]): MeasureAnswer {
  const done = measuredFor(slug, batch);
  if (done) return { status: 'measured', measurement: done };
  const all = readCiRuns(slug);
  const ids = new Set(batch.runIds);
  const mine = chronological(all.filter((r) => ids.has(r.runId)));
  const of = batch.runIds.length;
  const finished = mine.filter((r) => r.result !== 'running');
  if (finished.length < of) return { status: 'waiting', after: finished.length, of, message: `waiting: ${finished.length} of ${of} queued runs collected` };
  const head = finished.flatMap((r) => { const v = valueOf(claim, r); return v === undefined ? [] : [v]; });
  const first = Math.min(...batch.runIds.map(Number).filter(Number.isFinite));
  const before = variantRuns(claim, all, rules).filter((r) => !ids.has(r.runId) && (!Number.isFinite(first) || Number(r.runId) < first));
  const base = before.flatMap((r) => { const v = valueOf(claim, r); return v === undefined ? [] : [v]; }).slice(-of);
  const m = measurementOf(claim, 'queued', base, head, now);
  appendAdjustment(slug, m);
  return { status: 'measured', measurement: m };
}

/** The claim's latest queued batch, compared once all its runs are stored; a claim with none queued is refused. */
export function queuedMeasure(slug: string, claimId: string, now: Date = new Date()): MeasureAnswer {
  const claim = claimOf(slug, claimId);
  if (typeof claim === 'string') return { status: 'refused', reason: claim };
  if (!isCiClaim(claim)) return { status: 'refused', reason: `a ${claim.target.kind} claim is not measured from CI runs` };
  const batch = readQueued(slug).filter((b) => b.claimId === claimId).at(-1);
  if (!batch) return { status: 'refused', reason: 'no runs were queued for this claim' };
  return queuedMeasureWith(slug, claim, batch, now, loadProjects().find((p) => p.slug === slug)?.ci.variants);
}

/** After a collect: every claim with a queued batch not yet measured is compared now (a no-op while runs are missing). */
export function measureQueuedAll(slug: string, now: Date = new Date()): MeasureAnswer[] {
  const latest = new Map<string, QueuedBatch>();
  for (const b of readQueued(slug)) latest.set(b.claimId, b);
  return [...latest.keys()].map((id) => queuedMeasure(slug, id, now));
}
