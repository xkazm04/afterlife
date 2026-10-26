// Fleet's stream slices: the ?project= redirect only to a project the fleet has, notFound for an unknown project id,
// a project's estate cut to that project, and every slice plain JSON (the stream refuses anything else).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { unserialisable } from '@/app/features/screens/stream';
import type { SliceCtx, SliceResult } from '@/app/features/screens/types';
import { demoSource, setDataSource } from '@/server/data';
import { loadFleetData } from '../data/loadFleetData';
import { loaders } from './slices';

vi.mock('@/server/runs/readDesk', () => ({
  readDesk: async () => ({ fleet: 'missing', rows: [{ slug: 'nowhere', inFleet: false, waves: 1, needs: 0, costUsd: 2 }], needs: [] }),
}));
afterEach(() => setDataSource(null));

const ctx = (params: Record<string, string> = {}, q = ''): SliceCtx => ({ params, search: new URLSearchParams(q), signal: new AbortController().signal });
const run = (key: 'fleet' | 'fleet/[project]', slice: string, c: SliceCtx): Promise<SliceResult> => Promise.resolve(loaders[key]!.slices[slice]!(c));
const data = (r: SliceResult) => (r.status === 'ok' ? r.data : undefined);

describe('fleet slices', () => {
  it('declares core, estate, desk in stream order', () => {
    expect(Object.keys(loaders.fleet!.slices)).toEqual(['core', 'estate', 'desk']);
    expect(Object.keys(loaders['fleet/[project]']!.slices)).toEqual(['core', 'estate', 'desk']);
  });

  it('?project= redirects to the project page only for a project the fleet has', async () => {
    setDataSource(demoSource);
    const id = loadFleetData().projects[0]!.id;
    expect(await run('fleet', 'core', ctx({}, `project=${encodeURIComponent(id)}`))).toEqual({ status: 'redirect', to: `/fleet/${encodeURIComponent(id)}` });
    expect((await run('fleet', 'core', ctx({}, 'project=ghost'))).status).toBe('ok');
    expect((await run('fleet', 'core', ctx())).status).toBe('ok');
  });

  it('every slice is plain JSON (no Set from the list state: the client decodes that itself)', async () => {
    setDataSource(demoSource);
    for (const s of ['core', 'estate', 'desk']) expect(unserialisable(data(await run('fleet', s, ctx())))).toBeNull();
    expect(data(await run('fleet', 'core', ctx()))).not.toHaveProperty('start');
  });

  it('a project: notFound for an id the fleet does not have; its estate is its own rows only', async () => {
    setDataSource(demoSource);
    const fleet = loadFleetData();
    const id = fleet.deepId;
    expect(await run('fleet/[project]', 'core', ctx({ project: 'ghost' }))).toEqual({ status: 'notFound' });
    const core = data(await run('fleet/[project]', 'core', ctx({ project: id }))) as { project: { id: string }; fleetSize: number };
    expect(core.project.id).toBe(id);
    expect(core.fleetSize).toBe(fleet.projects.length);
    expect(core).not.toHaveProperty('data');
    const estate = data(await run('fleet/[project]', 'estate', ctx({ project: id }))) as { trend: { rows: { projectId: string }[] }; stability: object };
    expect(estate.trend.rows.length).toBeGreaterThan(0);
    expect(estate.trend.rows.every((r) => r.projectId === id)).toBe(true);
    expect(Object.keys(estate.stability).every((k) => k === id)).toBe(true);
    for (const s of ['core', 'estate', 'desk']) expect(unserialisable(data(await run('fleet/[project]', s, ctx({ project: id }))))).toBeNull();
  });

  it('desk: the runner strip and its spend, a repo matching no project listed, not dropped', async () => {
    setDataSource(demoSource);
    const desk = data(await run('fleet', 'desk', ctx())) as { cost: { unmatched: string[] } };
    expect(desk.cost.unmatched).toEqual(['nowhere']);
  });
});
