// One KQL per production signal, 1-hour bins from `since`: each returns (timestamp, v, n) rows. A table with no
// rows for a bin gives no point for it - an hour with no availability test is unknown, not 0 %.
import type { ProdSignal, ProdPoint } from '@/schemas/vitals';

export const BIN_MIN = 60;

const AGG: Record<ProdSignal, { table: string; v: string }> = {
  requests: { table: 'requests', v: 'count()' },
  'failed-rate': { table: 'requests', v: 'countif(success == false) * 1.0 / count()' },
  'p95-ms': { table: 'requests', v: 'percentile(duration, 95)' },
  exceptions: { table: 'exceptions', v: 'count()' },
  availability: { table: 'availabilityResults', v: 'avg(todouble(success))*100' },
};

export const SIGNALS = Object.keys(AGG) as ProdSignal[];

export function kql(signal: ProdSignal, since: string): string {
  const { table, v } = AGG[signal];
  return `${table} | where timestamp >= datetime(${since}) | summarize v=${v}, n=count() by bin(timestamp,1h)`;
}

/** The probe's question: how many requests the app served in the last day. */
export const COUNT_24H = 'requests | where timestamp > ago(1d) | count';

interface Table { columns?: { name?: string }[]; rows?: unknown[][] }

/** The first table of an `az monitor app-insights query` response; undefined when the shape is not one. */
export function firstTable(json: unknown): Table | undefined {
  const tables = (json as { tables?: unknown } | null)?.tables;
  return Array.isArray(tables) && tables[0] && typeof tables[0] === 'object' ? (tables[0] as Table) : undefined;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/**
 * (timestamp, v, n) rows as points, oldest first. A row with no finite value or no sample is dropped, and so is
 * any bin that has not closed by `now`: a stored bin is a finished one, so re-reading it never changes it.
 */
export function toPoints(signal: ProdSignal, json: unknown, now: Date): ProdPoint[] {
  const t = firstTable(json);
  if (!t?.rows?.length) return [];
  const col = (name: string) => (t.columns ?? []).findIndex((c) => c.name === name);
  const [it, iv, inn] = [col('timestamp'), col('v'), col('n')];
  if (it < 0 || iv < 0 || inn < 0) return [];
  const out: ProdPoint[] = [];
  for (const row of t.rows) {
    const at = typeof row[it] === 'string' ? Date.parse(row[it] as string) : NaN;
    const value = num(row[iv]);
    const n = num(row[inn]);
    if (!Number.isFinite(at) || value === undefined || !n) continue;
    if (at + BIN_MIN * 60_000 > now.getTime()) continue;
    const binStart = new Date(at).toISOString();
    out.push({ key: `${signal}:${binStart}`, signal, binStart, binMin: BIN_MIN, value, n });
  }
  return out.sort((a, b) => a.binStart.localeCompare(b.binStart));
}
