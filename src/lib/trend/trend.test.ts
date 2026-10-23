// The trend's arithmetic: deltas against the row 7 days before, null when that day is missing, the days count, the
// scopes; the rows a fleet makes; and the demo's seeded 28 days.
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { dayRowsOf } from './rows';
import { seedFleetDays } from './seed';
import { addDays, pendingLine, sinceLastWeek, trendOf, trendReady, type FleetDayRow } from './trend';

const row = (day: string, projectId: string, o: Partial<FleetDayRow> = {}): FleetDayRow => ({
  day, projectId, groupPath: 'core', needs: 0, stale: false, handsOff: 1, proofs7d: null, redRate: null, costUsd: null, ...o,
});

describe('trendOf', () => {
  const days = [
    row('2026-10-01', 'a', { needs: 1 }), row('2026-10-01', 'b', { needs: 2, groupPath: 'edge', handsOff: null }),
    row('2026-10-05', 'a', { needs: 2 }),
    row('2026-10-08', 'a', { needs: 4, stale: true, handsOff: 2 }), row('2026-10-08', 'b', { needs: 1, groupPath: 'edge', stale: true, handsOff: null }),
  ];

  it('compares today with the row 7 days before, and counts the distinct days', () => {
    const t = trendOf(days, '2026-10-08');
    expect(t.days).toBe(3);
    expect(t.delta).toEqual({ needs: 2, stale: 2, handsOff: 1 });
    expect(t.series.map((p) => p.day)).toEqual(['2026-10-01', '2026-10-05', '2026-10-08']);
    expect(trendReady(t)).toBe(true);
  });

  it('is null, never 0, when the day 7 before has no row', () => {
    const t = trendOf(days, '2026-10-05');
    expect(t.delta).toEqual({ needs: null, stale: null, handsOff: null });
    expect(trendReady(t)).toBe(false);
    expect(trendOf([], '2026-10-08')).toEqual({ days: 0, delta: { needs: null, stale: null, handsOff: null }, series: [] });
  });

  it('falls back to the newest row when today has none', () => {
    expect(trendOf(days, '2026-10-12').delta.needs).toBe(2);
  });

  it('scopes to a project or a group; hands-off unknown on every row stays null', () => {
    expect(trendOf(days, '2026-10-08', { project: 'a' }).delta).toEqual({ needs: 3, stale: 1, handsOff: 1 });
    const edge = trendOf(days, '2026-10-08', { group: 'edge' });
    expect(edge.delta).toEqual({ needs: -1, stale: 1, handsOff: null });
    expect(edge.days).toBe(2);
  });
});

describe('lines', () => {
  it('says the week in words, and the pending state with its n', () => {
    expect(sinceLastWeek({ days: 8, delta: { needs: 2, stale: 1, handsOff: 0 }, series: [] })).toBe('since last week: +2 waiting · +1 stale');
    expect(sinceLastWeek({ days: 3, delta: { needs: null, stale: null, handsOff: null }, series: [] })).toBe(pendingLine(3));
    expect(pendingLine(3)).toBe('trend starts after 7 days of polling (3 so far)');
  });
  it('moves days across a month', () => expect(addDays('2026-10-03', -7)).toBe('2026-09-26'));
});

describe('dayRowsOf', () => {
  it('counts what the fleet shows: no needs for an unwatched project, hands-off only when tiers are known', () => {
    const rows = dayRowsOf('2026-10-06', DEMO.fleet.projects);
    expect(rows).toHaveLength(DEMO.fleet.projects.length);
    for (const [i, p] of DEMO.fleet.projects.entries()) {
      expect(rows[i]!.stale).toBe(p.state === 'stale');
      if (p.state === 'not-set-up') expect(rows[i]!.needs).toBe(0);
      expect(rows[i]!.costUsd).toBeNull();
    }
  });
});

describe('seedFleetDays', () => {
  it('seeds 28 days per project, deterministically, the last day the fleet as given', () => {
    const a = seedFleetDays(DEMO.fleet.projects, '2026-10-06');
    expect(a).toEqual(seedFleetDays(DEMO.fleet.projects, '2026-10-06'));
    const t = trendOf(a, '2026-10-06');
    expect(t.days).toBe(28);
    expect(t.series[0]!.day).toBe('2026-09-09');
    expect(a.filter((r) => r.day === '2026-10-06')).toEqual(dayRowsOf('2026-10-06', DEMO.fleet.projects));
    expect(trendReady(t)).toBe(true);
    expect(a.every((r) => r.needs >= 0 && (r.handsOff === null || r.handsOff >= 0))).toBe(true);
  });
});
