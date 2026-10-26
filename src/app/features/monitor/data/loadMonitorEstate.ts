// What the Monitor reads beside the fleet (model/types MonitorEstate), on the server: the cycle runner's spend joined onto
// the fleet's projects and summed over the metered ones (real local run files in both modes, like Fleet's runner strip),
// the data source's agent-MR stability per project, and its 28-day trend (the demo's seeded). The screen stream reads
// the two halves as separate slices (screen/slices.ts): stability and trend are in memory, the spend waits on git.
import { getDataSource } from '@/server/data';
import { costByProject, costProjects, sumCost, type CostSum } from '@/lib/runs/desk/join';
import { utcDay } from '@/lib/trend/trend';
import type { RunnerDesk } from '@/lib/runs/desk/types';
import type { MonitorData, MonitorEstate } from '../model/types';

/** The data source's half: each project's agent-MR stability and the fleet's trend. */
export function loadMonitorSignals(): Pick<MonitorEstate, 'stability' | 'trend'> {
  const ds = getDataSource();
  return { stability: ds.getStability(), trend: { rows: ds.getFleetTrend(), today: utcDay(new Date()), seeded: ds.mode === 'demo' } };
}

/** The runner's half: the agents' spend over the fleet's metered projects; no desk: not read (null, never $0). */
export function monitorCost(data: Pick<MonitorData, 'projects' | 'org'>, runner: RunnerDesk | null): CostSum | null {
  if (!runner) return null;
  const { byProject } = costByProject(runner, costProjects(data.projects, data.org));
  return sumCost(byProject, data.projects.map((p) => p.id));
}

/** The estate for the Monitor's projects, from the runner desk the route read (readDesk); no desk: cost not read. */
export function loadMonitorEstate(data: Pick<MonitorData, 'projects' | 'org'>, runner: RunnerDesk | null): MonitorEstate {
  return { cost: monitorCost(data, runner), ...loadMonitorSignals() };
}
