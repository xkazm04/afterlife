// One project of the fleet for its page, /fleet/[project]: the project, and the fleet-wide data its sections read
// (class and stage names, the deep project's records) and the source's mode and events. null when no project has the id.
import type { FleetProject } from '@/lib/demo/types';
import type { FleetData, FleetSource } from '../model/types';
import { loadFleetData } from './loadFleetData';
import { loadFleetSource } from './loadFleetSource';

export interface FleetProjectView {
  project: FleetProject;
  data: FleetData;
  source: FleetSource;
}

export function loadFleetProject(id: string): FleetProjectView | null {
  const data = loadFleetData();
  const project = data.projects.find((p) => p.id === id);
  return project ? { project, data, source: loadFleetSource() } : null;
}
