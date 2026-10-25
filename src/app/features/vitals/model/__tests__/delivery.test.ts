import { describe, expect, it } from 'vitest';
import { PROJECT, RUNS } from '../../data/__fixtures__/grinex';
import { deliveryRows, failureRate, stageStats, UNCLASSIFIED } from '../delivery';
import { countedMs, median, p90, spanMs } from '../stats';

const MIN = 60_000;
const rows = deliveryRows(RUNS, PROJECT.ci);
const row = (id: string) => rows.find((r) => r.id === id)!;

describe('stats', () => {
  it('median: the middle one, the mean of the middle two, nothing for none', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeUndefined();
  });
  it('p90 by nearest rank', () => {
    expect(p90([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(9);
    expect(p90([5])).toBe(5);
    expect(p90([1, 2, 3, 4])).toBe(4);
    expect(p90([])).toBeUndefined();
  });
  it('a span needs both ends and never runs backwards', () => {
    expect(spanMs('2026-01-01T00:00:00Z', '2026-01-01T00:31:00Z')).toBe(31 * MIN);
    expect(spanMs('2026-01-01T00:00:00Z', undefined)).toBeUndefined();
    expect(spanMs('2026-01-01T01:00:00Z', '2026-01-01T00:00:00Z')).toBeUndefined();
  });
  it('a running, an unfinished or a canceled run is not counted', () => {
    expect(countedMs({ result: 'running', startedAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:10:00Z' })).toBeUndefined();
    expect(countedMs({ result: 'failed', startedAt: '2026-01-01T00:00:00Z' })).toBeUndefined();
    expect(countedMs({ result: 'canceled', startedAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:10:00Z' })).toBeUndefined();
    expect(countedMs({ result: 'partial', startedAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:10:00Z' })).toBe(10 * MIN);
  });
});

describe('deliveryRows', () => {
  it('one row per configured variant in config order, then unclassified', () => {
    expect(rows.map((r) => r.id)).toEqual(['master-full', 'master-hotfix', 'pr-feature', 'nightly', UNCLASSIFIED]);
  });

  it('master-full lists all six runs and counts the four finished ones: median, p90, failure rate', () => {
    const r = row('master-full');
    expect([r.runs, r.counted]).toEqual([6, 4]);
    // 186, 192, 199, 192 minutes of stages: sorted 186 192 192 199
    expect(r.medianMs).toBe(192 * MIN);
    expect(r.p90Ms).toBe(199 * MIN);
    expect(r.failureRate).toBe(0.25); // 1 failed of 4 finished; running and canceled are no verdict
    expect(r.trend).toEqual([186, 192, 199, 192]);
    expect(r.pipeline).toBe('Grinex Portal');
  });

  it('per-stage median and p90 over the counted runs only; the slowest stage by median', () => {
    const r = row('master-full');
    expect(r.stages.map((s) => s.name)).toEqual(['Build', 'E2E', 'Run Tests', 'Swap']);
    const build = r.stages.find((s) => s.name === 'Build')!;
    expect(build).toEqual({ name: 'Build', n: 4, medianMs: 31 * MIN, p90Ms: 32 * MIN }); // not the running 20 or canceled 5
    expect(r.slowestStage).toEqual({ name: 'Run Tests', medianMs: 144 * MIN });
  });

  it('the last runs are newest first and keep the running one without a duration', () => {
    const r = row('master-full');
    expect(r.last[0]).toMatchObject({ runId: '905', result: 'running' });
    expect(r.last[0]).not.toHaveProperty('durationMs');
    expect(r.last.find((l) => l.runId === '904')).toMatchObject({ durationMs: 192 * MIN });
  });

  it('a variant with no runs is a row with nothing measured: absent keys, never zeros', () => {
    const r = row('nightly');
    expect(r).toMatchObject({ runs: 0, counted: 0, noRuns: true, trend: [], stages: [], last: [] });
    for (const k of ['medianMs', 'p90Ms', 'failureRate', 'slowestStage']) expect(r).not.toHaveProperty(k);
  });

  it('runs with no variant are grouped as unclassified, named by their own pipeline', () => {
    expect(row(UNCLASSIFIED)).toMatchObject({ runs: 1, counted: 1, medianMs: 9 * MIN, pipeline: 'Grinex Portal' });
  });

  it('a variant id the config no longer lists still gets its row, before unclassified', () => {
    const extra = { ...RUNS[0]!, key: 'azure-pipelines:1', runId: '1', variant: 'old-lane' };
    expect(deliveryRows([...RUNS, extra], PROJECT.ci).map((r) => r.id).slice(-2)).toEqual(['old-lane', UNCLASSIFIED]);
  });

  it('failureRate is undefined with no finished run', () => {
    expect(failureRate(RUNS.filter((r) => r.result === 'running' || r.result === 'canceled'))).toBeUndefined();
  });

  it('stageStats keeps a stage only a running run reached, with n 0 and no figures', () => {
    expect(stageStats(RUNS.filter((r) => r.runId === '905'))).toEqual([{ name: 'Build', n: 0 }, { name: 'E2E', n: 0 }]);
  });
});
