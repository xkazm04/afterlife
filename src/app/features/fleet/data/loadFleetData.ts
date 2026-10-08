// Reads the data source (demo fixture or live index) once, on the server, into the shape the Fleet screen needs. What
// the two sources serve differently on purpose (the mode, the recent events) is `loadFleetSource`, beside this one.
import { getDataSource } from '@/server/data';
import { isSeeded } from '@/server/data/live/seeded';
import { fleetTask } from '../model/inspector';
import type { FleetData } from '../model/types';

export function loadFleetData(): FleetData {
  const ds = getDataSource();
  const fleet = ds.getFleet();
  const cockpit = ds.getCockpit();
  return {
    portfolio: ds.getPortfolio().group,
    projects: fleet.projects,
    groups: fleet.groups,
    classes: fleet.classes,
    stages: ds.getStages(),
    tiers: ds.getTiers(),
    lastPollSec: cockpit.feed.lastPollSec,
    deep: {
      id: ds.deepProjectId(),
      // live lists the group's own decisions only, as /needs-you does: the ids the demo seeds into an index are not its
      needs: ds.mode === 'live' ? ds.getNeedsYou().filter((n) => !isSeeded(n.id)) : ds.getNeedsYou(),
      actionClasses: Object.fromEntries(ds.getActionClasses().map((c) => [c.id, c])),
      tasks: ds.getTasks().map(fleetTask),
      tracks: ds.getTracks(),
      running: cockpit.running,
      webhooks: cockpit.feed.webhooks,
      unattributed: cockpit.unattributed,
    },
  };
}
