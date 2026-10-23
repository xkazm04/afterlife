// What the Monitor reads beside the fleet (model/types MonitorEstate), on the server: the cycle runner's spend joined onto
// the fleet's projects and summed over the metered ones (real local run files in both modes, like Fleet's runner strip),
// and the data source's agent-MR stability per project.
import { getDataSource } from '@/server/data';
import { costByProject, costProjects, sumCost } from '@/lib/runs/desk/join';
import type { RunnerDesk } from '@/lib/runs/desk/types';
import type { MonitorData, MonitorEstate } from '../model/types';

/** The estate for the Monitor's projects, from the runner desk the route read (readDesk); no desk: cost not read. */
export function loadMonitorEstate(data: Pick<MonitorData, 'projects' | 'org'>, runner: RunnerDesk | null): MonitorEstate {
  const stability = getDataSource().getStability();
  if (!runner) return { cost: null, stability };
  const { byProject } = costByProject(runner, costProjects(data.projects, data.org));
  return { cost: sumCost(byProject, data.projects.map((p) => p.id)), stability };
}
