// The trend's one write a day: after a poll cycle's snapshot, if fleet_day has no row for the snapshot's UTC day yet, one
// row per project from the numbers the snapshot serves the Fleet (src/lib/trend/rows.ts), with the stability beside them
// and the cycle runner's spend (E2's join; not read: null). A failed write is reported and the poll goes on.
import { costByProject, costProjects, type ProjectCost } from '@/lib/runs/desk/join';
import { dayRowsOf } from '@/lib/trend/rows';
import { addDays, TREND_DAYS, utcDay } from '@/lib/trend/trend';
import { readFleetDays, writeFleetDay } from '@/server/index/repositories/fleet/day';
import type { Queryable } from '@/server/index/repositories/sql';
import { readDesk } from '@/server/runs/readDesk';
import type { LiveSnapshot } from './snapshot';

/** The runner's spend per Fleet project, as Fleet's estate joins it; null when the local run files cannot be read. */
export type ReadCost = (snap: LiveSnapshot) => Promise<Readonly<Record<string, ProjectCost>> | null> | Readonly<Record<string, ProjectCost>> | null;

const deskCost: ReadCost = async (snap) => {
  try {
    return costByProject(await readDesk(),costProjects(snap.data.fleet.projects, snap.data.portfolio.group)).byProject;
  } catch {
    return null;
  }
};

/**
 * The snapshot with today's day written: unchanged when its trend already holds the day (one write per UTC day) or the
 * write wrote nothing; otherwise with the trend re-read, so the day shows at once.
 */
export async function recordFleetDay(db: Queryable, snap: LiveSnapshot, onError: (e: unknown) => void, cost: ReadCost = deskCost): Promise<LiveSnapshot> {
  const day = utcDay(snap.at);
  if (snap.data.trend.some((r) => r.day === day)) return snap;
  try {
    const wrote = await writeFleetDay(db, day, dayRowsOf(day, snap.data.fleet.projects, snap.data.stability, await cost(snap)));
    if (!wrote) return snap;
    return { ...snap, data: { ...snap.data, trend: await readFleetDays(db, addDays(day, 1 - TREND_DAYS)) } };
  } catch (e) {
    onError(e);
    return snap;
  }
}
