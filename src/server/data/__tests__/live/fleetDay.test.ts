// The trend's daily write: after a snapshot, one row per project for the snapshot's UTC day, from the numbers the Fleet
// shows; a second snapshot the same day writes nothing; the next day writes again; a failed write leaves the poll alone.
import { describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import { dayRowsOf } from '@/lib/trend/rows';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { readFleetDays } from '@/server/index/repositories/fleet/day';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { recordFleetDay } from '../../live/day';
import { liveSource } from '../../live/liveSource';
import { buildSnapshot } from '../../live/snapshot';

const noCost = () => null;

describe('recordFleetDay', () => {
  it('writes the day once, from the snapshot the Fleet reads, and the source serves it at once', async () => {
    const db = await memoryIndex();
    await seedDemo(db);
    const snap = await buildSnapshot(db, SEED_NOW, 'ledgerline', DEMO, null, 1);
    expect(snap.data.trend).toEqual([]);
    const after = await recordFleetDay(db, snap, () => undefined, noCost);
    const day = SEED_NOW.toISOString().slice(0, 10);
    const byId = (a: { projectId: string }, b: { projectId: string }) => (a.projectId < b.projectId ? -1 : 1);
    expect(after.data.trend).toEqual(dayRowsOf(day, snap.data.fleet.projects, snap.data.stability).sort(byId));
    expect(liveSource(() => after).getFleetTrend()).toBe(after.data.trend);

    // a later poll the same day: its snapshot already holds the day, and a write is refused by the table itself too
    const again = await buildSnapshot(db, new Date(SEED_NOW.getTime() + 3600_000), 'ledgerline', DEMO, null, 1);
    expect(await recordFleetDay(db, again, () => undefined, noCost)).toBe(again);
    expect(await recordFleetDay(db, { ...again, data: { ...again.data, trend: [] } }, () => undefined, noCost)).toEqual({ ...again, data: { ...again.data, trend: [] } });
    expect(await readFleetDays(db, day)).toHaveLength(snap.data.fleet.projects.length);

    const next = await buildSnapshot(db, new Date(SEED_NOW.getTime() + 86_400_000), 'ledgerline', DEMO, null, 1);
    const wrote = await recordFleetDay(db, next, () => undefined, noCost);
    expect(new Set(wrote.data.trend.map((r) => r.day)).size).toBe(2);
  });

  it('reports a failed write and keeps the snapshot', async () => {
    const db = await memoryIndex();
    const snap = await buildSnapshot(db, SEED_NOW, 'ledgerline', DEMO, null, 1);
    const withRow = { ...snap, data: { ...snap.data, fleet: { ...snap.data.fleet, projects: DEMO.fleet.projects } } };
    const onError = vi.fn();
    const broken = { query: () => Promise.reject(new Error('disk full')) };
    expect(await recordFleetDay(broken, withRow, onError, noCost)).toBe(withRow);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'disk full' }));
  });
});
