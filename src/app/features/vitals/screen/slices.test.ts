// Vitals' stream slices: loopback only, notFound for a slug no shown project has, each band its own slice, plain JSON;
// the demo projects only while the demo estate is on.
import { describe, expect, it, vi } from 'vitest';
import { unserialisable } from '@/app/features/screens/stream';
import type { SliceCtx, SliceResult } from '@/app/features/screens/types';
import { ADJUSTMENTS, MARKERS, NOW, PROD, PROJECT, RUNS } from '../data/__fixtures__/grinex';
import { adjustmentsFold, ciFold, configRow, configView, prodFold, runsCell } from '../model/view';

const estate = vi.hoisted(() => ({ demo: false }));
vi.mock('@/components/shell/live/estateRead', () => ({ readEstate: async () => ({ setting: 'auto', real: 1, demo: estate.demo }) }));
vi.mock('../data/jobs', () => ({ jobOf: (slug: string) => (slug === PROJECT.slug || slug === 'ledgerline' ? { startedAt: NOW } : undefined) }));
vi.mock('../data/loadVitals', () => ({
  loadVitalsConfig: (demo: boolean) => (demo ? [configRow(PROJECT), { ...configRow(PROJECT), slug: 'ledgerline', demo: true }] : [configRow(PROJECT)]),
  loadVitalsRuns: () => ({ [PROJECT.slug]: runsCell(RUNS) }),
  projectConfig: (slug: string, demo: boolean) =>
    slug === PROJECT.slug ? { cfg: PROJECT, demo: false } : demo && slug === 'ledgerline' ? { cfg: { ...PROJECT, slug }, demo: true } : null,
  loadConfig: (p: { cfg: typeof PROJECT }) => configView(p.cfg),
  loadCi: () => ciFold(PROJECT, RUNS),
  loadProd: () => prodFold(PROJECT, PROD, MARKERS, NOW),
  loadAdjustments: () => adjustmentsFold(PROJECT, ADJUSTMENTS),
}));
const { loaders } = await import('./slices');

const ctx = (params: Record<string, string> = {}): SliceCtx => ({ params, search: new URLSearchParams(), signal: new AbortController().signal });
const run = (key: 'vitals' | 'vitals/[project]', slice: string, c: SliceCtx): Promise<SliceResult> => Promise.resolve(loaders[key]!.slices[slice]!(c));

describe('vitals slices', () => {
  it('both keys are loopback only, their slices in stream order', () => {
    expect(loaders.vitals).toMatchObject({ local: true });
    expect(loaders['vitals/[project]']).toMatchObject({ local: true });
    expect(Object.keys(loaders.vitals!.slices)).toEqual(['config', 'runs']);
    expect(Object.keys(loaders['vitals/[project]']!.slices)).toEqual(['config', 'job', 'ci', 'prod', 'adjustments']);
  });

  it('the list: the configs, then the runs per slug with the clock they are aged from', async () => {
    expect(await run('vitals', 'config', ctx())).toEqual({ status: 'ok', data: { projects: [configRow(PROJECT)] } });
    const runs = await run('vitals', 'runs', ctx());
    expect(runs.status === 'ok' && runs.data).toMatchObject({ bySlug: { [PROJECT.slug]: { runsStored: RUNS.length } } });
  });

  it('the demo estate: its projects listed only while it is on, and a demo project never shows a collect job', async () => {
    expect(await run('vitals', 'config', ctx())).toEqual({ status: 'ok', data: { projects: [configRow(PROJECT)] } });
    expect(await run('vitals/[project]', 'config', ctx({ project: 'ledgerline' }))).toEqual({ status: 'notFound' });
    estate.demo = true;
    try {
      const list = await run('vitals', 'config', ctx());
      expect(list.status === 'ok' && list.data).toMatchObject({ projects: [{ slug: PROJECT.slug }, { slug: 'ledgerline', demo: true }] });
      expect(await run('vitals/[project]', 'job', ctx({ project: 'ledgerline' }))).toEqual({ status: 'ok', data: {} });
    } finally {
      estate.demo = false;
    }
  });

  it('a slug no saved project has: every project slice is notFound', async () => {
    for (const s of ['config', 'job', 'ci', 'prod', 'adjustments']) expect(await run('vitals/[project]', s, ctx({ project: 'ghost' }))).toEqual({ status: 'notFound' });
  });

  it('a saved project: each band its own slice, all plain JSON', async () => {
    const p = ctx({ project: PROJECT.slug });
    const job = await run('vitals/[project]', 'job', p);
    expect(job).toEqual({ status: 'ok', data: { job: { startedAt: NOW } } });
    for (const s of ['config', 'job', 'ci', 'prod', 'adjustments']) {
      const r = await run('vitals/[project]', s, p);
      expect(r.status).toBe('ok');
      expect(unserialisable(r.status === 'ok' ? r.data : null)).toBeNull();
    }
  });
});
