import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import { APP_ID, COMPONENT, EXPIRED, SUB, fakeAz, table } from './fixtures';
import { azureInsights } from './index';
import { kql, toPoints } from './kql';

const NOW = new Date('2026-10-25T12:30:00Z');
const cfg = { cloud: { provider: 'azure-app-insights', resource: { appId: APP_ID, name: COMPONENT.name, resourceGroup: 'shop-rg', subscription: SUB } } } as ProjectConfig;

describe('kql', () => {
  it('one hourly summarize per signal, from the given instant', () => {
    const since = '2026-10-24T12:00:00.000Z';
    expect(kql('requests', since)).toBe('requests | where timestamp >= datetime(2026-10-24T12:00:00.000Z) | summarize v=count(), n=count() by bin(timestamp,1h)');
    expect(kql('failed-rate', since)).toContain('v=countif(success == false) * 1.0 / count(), n=count()');
    expect(kql('p95-ms', since)).toContain('v=percentile(duration, 95)');
    expect(kql('exceptions', since)).toMatch(/^exceptions \|/);
    expect(kql('availability', since)).toMatch(/^availabilityResults \|.*v=avg\(todouble\(success\)\)\*100, n=count\(\)/);
  });
});

describe('toPoints', () => {
  it('parses (timestamp, v, n) rows into keyed hourly points, oldest first', () => {
    const json = table([['2026-10-25T09:00:00Z', 412.5, 980], ['2026-10-25T08:00:00Z', 388, 1022]]);
    expect(toPoints('p95-ms', json, NOW)).toEqual([
      { key: 'p95-ms:2026-10-25T08:00:00.000Z', signal: 'p95-ms', binStart: '2026-10-25T08:00:00.000Z', binMin: 60, value: 388, n: 1022 },
      { key: 'p95-ms:2026-10-25T09:00:00.000Z', signal: 'p95-ms', binStart: '2026-10-25T09:00:00.000Z', binMin: 60, value: 412.5, n: 980 },
    ]);
  });

  it('a failed-rate of 0 is a measured 0, kept', () => {
    expect(toPoints('failed-rate', table([['2026-10-25T08:00:00Z', 0, 50]]), NOW).map((p) => p.value)).toEqual([0]);
  });

  it('an empty table gives no points - an hour without availability tests is unknown, not 0', () => {
    expect(toPoints('availability', table([]), NOW)).toEqual([]);
    expect(toPoints('availability', { tables: [] }, NOW)).toEqual([]);
    expect(toPoints('availability', null, NOW)).toEqual([]);
  });

  it('drops the bin still open at `now`, a null value and a row with no samples', () => {
    const json = table([['2026-10-25T12:00:00Z', 5, 5], ['2026-10-25T10:00:00Z', null, 4], ['2026-10-25T11:00:00Z', 7, 0], ['2026-10-25T09:00:00Z', 3, 3]]);
    expect(toPoints('exceptions', json, NOW).map((p) => p.binStart)).toEqual(['2026-10-25T09:00:00.000Z']);
  });
});

describe('query', () => {
  it('runs one KQL per signal from `since` and gathers their points', async () => {
    const rows = table([['2026-10-24T08:00:00Z', 1, 10]]);
    const { exec, calls } = fakeAz([{ match: ['query', '--apps', APP_ID, '--start-time', '2026-10-24T00:00:00.000Z'], reply: { stdout: rows } }]);
    const points = await azureInsights(exec).query(cfg, '2026-10-24T00:00:00.000Z');
    expect(calls).toHaveLength(5);
    expect(calls.every((c) => c.includes('--subscription') && c.includes(SUB))).toBe(true);
    expect(points.map((p) => p.key)).toEqual(['requests', 'failed-rate', 'p95-ms', 'exceptions', 'availability'].map((s) => `${s}:2026-10-24T08:00:00.000Z`));
  });

  it('a lapsed login rejects with the re-login command for the collector to report', async () => {
    const { exec } = fakeAz([{ match: ['query'], reply: { code: 1, stderr: EXPIRED } }]);
    await expect(azureInsights(exec).query(cfg, '2026-10-24T00:00:00.000Z')).rejects.toThrow('run `az login`');
  });
});
