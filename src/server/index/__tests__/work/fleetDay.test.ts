// fleet_day: one row per project per UTC day, a second write the same day writes nothing, and the table refuses update
// and delete (the append-only trigger of migration 0019, as ledger_event's).
import { describe, expect, it, vi } from 'vitest';
import type { FleetDayRow } from '@/lib/trend/trend';
import { readFleetDays, writeFleetDay } from '../../repositories';
import { memoryIndex } from '../memoryIndex';

vi.mock('server-only', () => ({}));

const row = (projectId: string, o: Partial<FleetDayRow> = {}): FleetDayRow => ({
  day: 'ignored', projectId, groupPath: 'core', needs: 2, stale: false, handsOff: null, proofs7d: 5, redRate: 0.25, costUsd: null, ...o,
});

describe('fleet_day', () => {
  it('writes one row per project for the day, and reads them back with null kept null', async () => {
    const db = await memoryIndex();
    expect(await writeFleetDay(db, '2026-10-06', [row('a'), row('b', { stale: true, handsOff: 3, costUsd: 1.5 })])).toBe(2);
    expect(await readFleetDays(db, '2026-10-01')).toEqual([
      row('a', { day: '2026-10-06' }),
      row('b', { day: '2026-10-06', stale: true, handsOff: 3, costUsd: 1.5 }),
    ]);
  });

  it('writes nothing on a second write the same day, even for a project new that day', async () => {
    const db = await memoryIndex();
    await writeFleetDay(db, '2026-10-06', [row('a')]);
    expect(await writeFleetDay(db, '2026-10-06', [row('a', { needs: 9 }), row('c')])).toBe(0);
    expect((await readFleetDays(db, '2026-10-06')).map((r) => [r.projectId, r.needs])).toEqual([['a', 2]]);
    expect(await writeFleetDay(db, '2026-10-07', [row('a', { needs: 3 })])).toBe(1);
    expect((await readFleetDays(db, '2026-10-07')).map((r) => r.day)).toEqual(['2026-10-07']);
  });

  it('refuses update and delete', async () => {
    const db = await memoryIndex();
    await writeFleetDay(db, '2026-10-06', [row('a')]);
    await expect(db.query(`update fleet_day set needs = 0`)).rejects.toThrow(/append-only/);
    await expect(db.query(`delete from fleet_day`)).rejects.toThrow(/append-only/);
    expect(await readFleetDays(db, '2026-10-06')).toHaveLength(1);
  });
});
