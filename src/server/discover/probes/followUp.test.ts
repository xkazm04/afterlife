// A found resource's query runs right behind the probe that found it, once; a fail or a workspace without HTTP logs
// names nothing.
import { describe, expect, it } from 'vitest';
import type { ProbeResult, ProbeSpec } from '@/schemas/vitals';
import { followUpOf } from './followUp';
import { runProbesWith, type ProbeDeps } from './run';

const AT = '2026-10-25T09:00:00.000Z';
const res = (spec: ProbeSpec, status: ProbeResult['status'], data?: Record<string, string>): ProbeResult => ({ ...spec, status, summary: '', at: AT, ms: 1, ...(data ? { data } : {}) });
const WS: ProbeSpec = { kind: 'az-loganalytics-workspace', args: { resourceGroup: 'rg', site: 'shop' } };
const FOUND = { workspaceId: 'w-1', name: 'logs', resourceGroup: 'rg', subscription: 's-1', httpLogs: 'yes' };

describe('followUpOf', () => {
  it('a found workspace names its HTTP-logs query for the asked site; a found component its query', () => {
    expect(followUpOf(WS, res(WS, 'ok', FOUND))).toEqual({ kind: 'az-loganalytics-query', args: { workspaceId: 'w-1', site: 'shop', subscription: 's-1' } });
    const ai: ProbeSpec = { kind: 'az-appinsights-component', args: { resourceGroup: 'rg' } };
    expect(followUpOf(ai, res(ai, 'ok', { appId: 'a-1' }))).toEqual({ kind: 'az-appinsights-query', args: { appId: 'a-1' } });
  });

  it('a fail, a workspace without HTTP logs and any other kind name nothing', () => {
    expect(followUpOf(WS, res(WS, 'fail'))).toBeUndefined();
    expect(followUpOf(WS, res(WS, 'ok', { ...FOUND, httpLogs: 'no' }))).toBeUndefined();
    const g: ProbeSpec = { kind: 'git-root', args: {} };
    expect(followUpOf(g, res(g, 'ok', { root: '/r' }))).toBeUndefined();
  });

  it('runProbesWith runs the follow-up right behind, and never twice', async () => {
    const asked: string[] = [];
    const cloud = () => ({
      kind: 'azure-log-analytics' as const,
      probe: async (spec: ProbeSpec) => (asked.push(spec.kind), spec.kind === 'az-loganalytics-workspace' ? res(spec, 'ok', FOUND) : res(spec, 'ok')),
      query: async () => [],
    });
    const deps = { ci: () => { throw new Error('no ci'); }, cloud, now: () => new Date(AT) } as unknown as ProbeDeps;
    const out = await runProbesWith([WS, { kind: 'git-root', args: {} }, WS], process.cwd(), deps);
    expect(out.map((r) => r.kind)).toEqual(['az-loganalytics-workspace', 'az-loganalytics-query', 'git-root', 'az-loganalytics-workspace']);
    expect(asked.filter((k) => k === 'az-loganalytics-query')).toHaveLength(1);
  });
});
