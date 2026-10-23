// What Fleet draws beside its projects (model/types FleetEstate), read on the server by the route beside loadFleetData: the
// cycle runner's spend joined onto the fleet's projects, and the data source's agent-MR stability. Kept out of FleetData,
// so the demo/live parity is unaffected.
import { getDataSource } from '@/server/data';
import { costByProject, costProjects } from '@/lib/runs/desk/join';
import type { RunnerDesk } from '@/lib/runs/desk/types';
import type { FleetData, FleetEstate } from '../model/types';

/** The estate for these projects, from the runner desk the route read (readDesk); no desk: cost not read (null). */
export function loadFleetEstate(data: Pick<FleetData, 'projects' | 'portfolio'>, runner: RunnerDesk | null): FleetEstate {
  return { cost: runner ? costByProject(runner, costProjects(data.projects, data.portfolio)) : null, stability: getDataSource().getStability() };
}
