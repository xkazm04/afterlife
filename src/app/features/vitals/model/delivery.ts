// Delivery: the stored CI runs folded into one row per variant. A variant is the VariantRule id the collector stamped
// on the run (CiRun.variant); a run no rule matched sits in "unclassified". Pure: runs and the config in, rows out.
import type { CiConfig, CiRun } from '@/schemas/vitals';
import { countedMs, median, p90, spanMs } from './stats';
import type { RunLine, StageStat, VariantRow } from './types';

export const UNCLASSIFIED = 'unclassified';
export const TREND_RUNS = 30;
export const LAST_RUNS = 20;

const byStart = (a: CiRun, b: CiRun): number => Date.parse(a.startedAt) - Date.parse(b.startedAt);
const MIN = 60_000;

/** A stage's own time, counted only for a finished stage of a counted run. */
const stageMs = (s: CiRun['stages'][number]): number | undefined => (s.result === 'running' ? undefined : spanMs(s.startedAt, s.finishedAt));

/** Per stage name, in the order the stages first ran: n, median and p90 over the counted runs that timed it. */
export function stageStats(runs: readonly CiRun[]): StageStat[] {
  const times = new Map<string, number[]>();
  for (const r of [...runs].sort(byStart)) {
    const counted = countedMs(r) !== undefined;
    for (const s of r.stages) {
      if (!times.has(s.name)) times.set(s.name, []);
      const ms = counted ? stageMs(s) : undefined;
      if (ms !== undefined) times.get(s.name)!.push(ms);
    }
  }
  return [...times].map(([name, ms]) => {
    const st: StageStat = { name, n: ms.length };
    const m = median(ms);
    const p = p90(ms);
    if (m !== undefined) st.medianMs = m;
    if (p !== undefined) st.p90Ms = p;
    return st;
  });
}

function runLine(r: CiRun): RunLine {
  const line: RunLine = {
    runId: r.runId,
    branch: r.branch,
    result: r.result,
    startedAt: r.startedAt,
    stages: r.stages.map((s) => {
      const ms = stageMs(s);
      return ms === undefined ? { name: s.name, result: s.result } : { name: s.name, result: s.result, ms };
    }),
  };
  const ms = countedMs(r);
  if (ms !== undefined) line.durationMs = ms;
  return line;
}

/** failed / (succeeded + failed + partial): a running or canceled run is no verdict on the pipeline. */
export function failureRate(runs: readonly CiRun[]): number | undefined {
  const done = runs.filter((r) => r.result === 'succeeded' || r.result === 'failed' || r.result === 'partial');
  return done.length ? done.filter((r) => r.result === 'failed').length / done.length : undefined;
}

export function variantRow(id: string, pipeline: string, runs: readonly CiRun[]): VariantRow {
  const sorted = [...runs].sort(byStart);
  const ms = sorted.map(countedMs).filter((v): v is number => v !== undefined);
  const stages = stageStats(sorted);
  const row: VariantRow = {
    id,
    pipeline,
    runs: runs.length,
    counted: ms.length,
    trend: ms.slice(-TREND_RUNS).map((v) => Math.round((v / MIN) * 10) / 10),
    stages,
    last: sorted.slice(-LAST_RUNS).reverse().map(runLine),
  };
  const m = median(ms);
  const p = p90(ms);
  const f = failureRate(runs);
  if (m !== undefined) row.medianMs = m;
  if (p !== undefined) row.p90Ms = p;
  if (f !== undefined) row.failureRate = f;
  const slow = stages.filter((s) => s.medianMs !== undefined).sort((a, b) => b.medianMs! - a.medianMs!)[0];
  if (slow) row.slowestStage = { name: slow.name, medianMs: slow.medianMs! };
  if (!runs.length) row.noRuns = true;
  return row;
}

const names = (xs: Iterable<string>): string => [...new Set(xs)].join(', ');

/**
 * One row per configured variant (in the config's order, a rule with no run yet included), then any variant id the runs
 * carry that the config no longer lists, then "unclassified" when some run matched no rule.
 */
export function deliveryRows(runs: readonly CiRun[], ci: CiConfig): VariantRow[] {
  const pipeName = new Map(ci.pipelines.map((p) => [p.id, p.name]));
  const groups = new Map<string, CiRun[]>();
  for (const r of runs) {
    const k = r.variant ?? UNCLASSIFIED;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const ruleIds = [...new Set(ci.variants.map((v) => v.id))];
  const rows = ruleIds.map((id) => {
    const rules = ci.variants.filter((v) => v.id === id);
    return variantRow(id, names(rules.map((v) => pipeName.get(v.pipelineId) ?? v.pipelineId)), groups.get(id) ?? []);
  });
  for (const [id, rs] of groups) {
    if (id === UNCLASSIFIED || ruleIds.includes(id)) continue;
    rows.push(variantRow(id, names(rs.map((r) => r.pipelineName)), rs));
  }
  const loose = groups.get(UNCLASSIFIED);
  if (loose) rows.push(variantRow(UNCLASSIFIED, names(loose.map((r) => r.pipelineName)), loose));
  return rows;
}
