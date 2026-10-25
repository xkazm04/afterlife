import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import { toPoints } from '../insights/kql';
import { asTable } from './az';
import { EXPIRED, NO_TABLE_ERR, SUB, WS_ID, fakeAz, rows } from './fixtures';
import { azureLogs } from './index';
import { COLUMNS, kql } from './kql';

const NOW = new Date('2026-10-25T12:30:00Z');
const SINCE = '2026-10-24T00:00:00.000Z';
const logs = { workspaceId: WS_ID, name: 'shop-logs', resourceGroup: 'shop-rg', subscription: SUB };
const cfg = (site?: string) => ({ cloud: { provider: 'azure-log-analytics', logs: { ...logs, ...(site ? { site } : {}) } } }) as ProjectConfig;

describe('kql', () => {
  it('one hourly summarize per signal over the HTTP logs, from the given instant', () => {
    expect(kql('requests', SINCE)).toBe('AppServiceHTTPLogs | where TimeGenerated >= datetime(2026-10-24T00:00:00.000Z) | summarize v=count(), n=count() by timestamp=bin(TimeGenerated,1h)');
    expect(kql('failed-rate', SINCE)).toContain('v=countif(ScStatus >= 500) * 1.0 / count(), n=count()');
    expect(kql('p95-ms', SINCE)).toContain('v=percentile(TimeTaken, 95)');
  });

  it('a site narrows to its own _ResourceId; a quote in it cannot end the string', () => {
    expect(kql('requests', SINCE, 'shopfront')).toContain('| where _ResourceId endswith "/sites/shopfront" |');
    expect(kql('requests', SINCE, 'a"b')).toContain('endswith "/sites/a\\"b"');
  });
});

describe('asTable + toPoints', () => {
  it('parses string-valued row objects into keyed hourly points, oldest first', () => {
    const json = rows([['2026-10-25T09:00:00Z', '412', '980'], ['2026-10-25T08:00:00Z', '388.5', '1022']]);
    expect(toPoints('p95-ms', asTable(json, COLUMNS), NOW)).toEqual([
      { key: 'p95-ms:2026-10-25T08:00:00.000Z', signal: 'p95-ms', binStart: '2026-10-25T08:00:00.000Z', binMin: 60, value: 388.5, n: 1022 },
      { key: 'p95-ms:2026-10-25T09:00:00.000Z', signal: 'p95-ms', binStart: '2026-10-25T09:00:00.000Z', binMin: 60, value: 412, n: 980 },
    ]);
  });

  it('a failed-rate of "0" is a measured 0, kept; an empty or non-numeric value is dropped, never read as 0', () => {
    const json = rows([['2026-10-25T08:00:00Z', '0', '50'], ['2026-10-25T09:00:00Z', '', '4'], ['2026-10-25T10:00:00Z', 'NaN', '4']]);
    expect(toPoints('failed-rate', asTable(json, COLUMNS), NOW).map((p) => [p.binStart, p.value])).toEqual([['2026-10-25T08:00:00.000Z', 0]]);
  });

  it('drops the bin still open at `now`; no rows or an unexpected shape give no points', () => {
    expect(toPoints('requests', asTable(rows([['2026-10-25T12:00:00Z', '5', '5']]), COLUMNS), NOW)).toEqual([]);
    expect(toPoints('requests', asTable([], COLUMNS), NOW)).toEqual([]);
    expect(toPoints('requests', asTable({ tables: [] }, COLUMNS), NOW)).toEqual([]);
  });
});

describe('query', () => {
  it('runs one KQL per HTTP-log signal over [since, now], and never asks for exceptions or availability', async () => {
    const { exec, calls } = fakeAz([{ match: ['query', '-w', WS_ID, '--timespan', `${SINCE}/${NOW.toISOString()}`, '--subscription', SUB], reply: { stdout: rows([['2026-10-24T08:00:00Z', '1', '10']]) } }]);
    const points = await azureLogs(exec, () => NOW).query(cfg('shopfront'), SINCE);
    expect(calls).toHaveLength(3);
    expect(calls.every((c) => c.some((a) => a.includes('endswith "/sites/shopfront"')))).toBe(true);
    expect(points.map((p) => p.key)).toEqual(['requests', 'failed-rate', 'p95-ms'].map((s) => `${s}:2026-10-24T08:00:00.000Z`));
    expect(points.some((p) => p.signal === 'exceptions' || p.signal === 'availability')).toBe(false);
  });

  it('without a site it reads every app in the workspace', async () => {
    const { exec, calls } = fakeAz([{ match: ['query'], reply: { stdout: [] } }]);
    expect(await azureLogs(exec, () => NOW).query(cfg(), SINCE)).toEqual([]);
    expect(calls.flat().join(' ')).not.toContain('_ResourceId');
  });

  it('no workspace configured reads nothing', async () => {
    const { exec, calls } = fakeAz([]);
    expect(await azureLogs(exec).query({ cloud: { provider: 'azure-log-analytics' } } as ProjectConfig, SINCE)).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('a lapsed login or a missing table rejects with its summary for the collector to report', async () => {
    await expect(azureLogs(fakeAz([{ match: ['query'], reply: { code: 1, stderr: EXPIRED } }]).exec).query(cfg(), SINCE)).rejects.toThrow('run `az login`');
    await expect(azureLogs(fakeAz([{ match: ['query'], reply: { code: 1, stderr: NO_TABLE_ERR } }]).exec).query(cfg(), SINCE)).rejects.toThrow('the App Service diagnostic setting is off');
  });
});
