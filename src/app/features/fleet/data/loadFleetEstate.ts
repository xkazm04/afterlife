// What Fleet draws beside its projects (model/types FleetEstate), read on the server: the data source's agent-MR stability
// and its 28-day trend (the demo's seeded), and the cycle runner's spend joined onto the fleet's projects. The screen
// stream reads them as separate slices (screen/slices.ts): stability and trend are in memory, the spend waits on git.
// Kept out of FleetData, so the demo/live parity is unaffected.
import { getDataSource } from '@/server/data';
import { costByProject, costProjects, type CostJoin } from '@/lib/runs/desk/join';
import { utcDay, type TrendFeed } from '@/lib/trend/trend';
import type { RunnerDesk } from '@/lib/runs/desk/types';
import type { Stability } from '@/lib/stability/stability';
import type { FleetData } from '../model/types';

export interface FleetSignals {
  stability: Readonly<Record<string, Stability>>;
  trend: TrendFeed;
}

/** The data source's half: each project's agent-MR stability and the fleet's trend. */
export function loadFleetSignals(): FleetSignals {
  const ds = getDataSource();
  return { stability: ds.getStability(), trend: { rows: ds.getFleetTrend(), today: utcDay(new Date()), seeded: ds.mode === 'demo' } };
}

/** One project's slice of the signals: its stability (absent: not read) and its own trend rows only. */
export function projectSignals(id: string, all: FleetSignals = loadFleetSignals()): FleetSignals {
  const s = all.stability[id];
  return { stability: s ? { [id]: s } : {}, trend: { ...all.trend, rows: all.trend.rows.filter((r) => r.projectId === id) } };
}

/** The runner's half: its spend put on these projects. */
export function fleetCost(data: Pick<FleetData, 'projects' | 'portfolio'>, runner: RunnerDesk): CostJoin {
  return costByProject(runner, costProjects(data.projects, data.portfolio));
}
