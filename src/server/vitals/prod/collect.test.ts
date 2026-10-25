import { describe, expect, it } from 'vitest';
import type { ProdPoint, ProjectConfig } from '@/schemas/vitals';
import type { CloudProvider } from '@/server/providers/types';
import { collectProd, prodSince } from './collect';

const NOW = new Date('2026-10-25T12:30:00Z');
const RES = { appId: 'app', name: 'shopfront', resourceGroup: 'shop-rg', subscription: 'sub' };
const cfg = (cloud: ProjectConfig['cloud']) => ({ cloud }) as ProjectConfig;
const pt = (signal: ProdPoint['signal'], binStart: string, value = 1): ProdPoint => ({ key: `${signal}:${binStart}`, signal, binStart, binMin: 60, value, n: 10 });

function provider(points: ProdPoint[] | Error): CloudProvider & { sinces: string[] } {
  const sinces: string[] = [];
  return {
    kind: 'azure-app-insights',
    sinces,
    probe: () => Promise.reject(new Error('unused')),
    query: async (_c, since) => {
      sinces.push(since);
      if (points instanceof Error) throw points;
      return points;
    },
  };
}

describe('prodSince', () => {
  it('starts at the newest stored bin, or 14 days back on the hour', () => {
    expect(prodSince([pt('requests', '2026-10-25T08:00:00.000Z'), pt('requests', '2026-10-25T10:00:00.000Z')], NOW)).toBe('2026-10-25T10:00:00.000Z');
    expect(prodSince([], NOW)).toBe('2026-10-11T12:00:00.000Z');
  });
});

describe('collectProd', () => {
  it('a cloud that is not connected is a skipped probe and no points, without asking anyone', async () => {
    const p = provider([]);
    for (const c of [cfg({ provider: 'none' }), cfg({ provider: 'azure-app-insights' })]) {
      const r = await collectProd(c, p, [], NOW);
      expect(r.points).toEqual([]);
      expect(r.probes).toMatchObject([{ status: 'skipped', summary: 'cloud not connected' }]);
    }
    expect(p.sinces).toEqual([]);
  });

  it('is idempotent against what is stored: only new keys come back, and a second pass adds nothing', async () => {
    const stored = [pt('requests', '2026-10-25T09:00:00.000Z')];
    const fresh = [pt('requests', '2026-10-25T09:00:00.000Z', 99), pt('requests', '2026-10-25T10:00:00.000Z'), pt('p95-ms', '2026-10-25T10:00:00.000Z')];
    const p = provider(fresh);
    const first = await collectProd(cfg({ provider: 'azure-app-insights', resource: RES }), p, stored, NOW);
    expect(first.points.map((x) => x.key)).toEqual(['requests:2026-10-25T10:00:00.000Z', 'p95-ms:2026-10-25T10:00:00.000Z']);
    expect(first.probes).toMatchObject([{ kind: 'az-appinsights-query', status: 'ok', summary: '2 new points since 2026-10-25T09:00:00.000Z' }]);
    const second = await collectProd(cfg({ provider: 'azure-app-insights', resource: RES }), p, [...stored, ...first.points], NOW);
    expect(second.points).toEqual([]);
    expect(p.sinces).toEqual(['2026-10-25T09:00:00.000Z', '2026-10-25T10:00:00.000Z']);
  });

  it('never stores the bin still open at `now`', async () => {
    const r = await collectProd(cfg({ provider: 'azure-app-insights', resource: RES }), provider([pt('requests', '2026-10-25T12:00:00.000Z')]), [], NOW);
    expect(r.points).toEqual([]);
  });

  it('a provider failure is a fail probe carrying its summary, never a throw', async () => {
    const r = await collectProd(cfg({ provider: 'azure-app-insights', resource: RES }), provider(new Error('ERROR: token expired - run `az login`')), [], NOW);
    expect(r).toMatchObject({ points: [], probes: [{ status: 'fail', summary: 'ERROR: token expired - run `az login`', args: { appId: 'app' } }] });
  });
});
