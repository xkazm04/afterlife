// One project of the fleet for its page, /fleet/[project]: the project, the fleet-wide data its sections read (class and
// stage names, the tiers) and its view, decided here once: the deep project's decisions, records, tasks and tracks are
// read for that project only, and its buttons are those of the source's mode. null when no project has the id.
import { getDataSource, type DataSource } from '@/server/data';
import { isSeeded } from '@/server/data/live/seeded';
import type { FleetProject } from '@/lib/demo/types';
import { fleetTask } from '../model/inspector';
import { projectView, type ProjectView } from '../model/project/view';
import type { DeepProject, FleetData } from '../model/types';
import { loadFleetData } from './loadFleetData';
import { loadFleetSource } from './loadFleetSource';

export interface FleetProjectView {
  project: FleetProject;
  data: FleetData;
  view: ProjectView;
}

function readDeep(ds: DataSource): DeepProject {
  const cockpit = ds.getCockpit();
  return {
    id: ds.deepProjectId(),
    // live lists the group's own decisions only, as /needs-you does: the ids the demo seeds into an index are not its
    needs: ds.mode === 'live' ? ds.getNeedsYou().filter((n) => !isSeeded(n.id)) : ds.getNeedsYou(),
    actionClasses: Object.fromEntries(ds.getActionClasses().map((c) => [c.id, c])),
    tasks: ds.getTasks().map(fleetTask),
    tracks: ds.getTracks(),
    running: cockpit.running,
    webhooks: cockpit.feed.webhooks,
    unattributed: cockpit.unattributed,
  };
}

export function loadFleetProject(id: string): FleetProjectView | null {
  const data = loadFleetData();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return null;
  const deep = id === data.deepId ? readDeep(getDataSource()) : null;
  return { project, data, view: projectView(project, deep, { portfolio: data.portfolio, deepId: data.deepId, source: loadFleetSource() }) };
}
