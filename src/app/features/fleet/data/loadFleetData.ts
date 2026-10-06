// Reads the data source (demo fixture or live index) once, on the server, into the shape the Fleet screen needs.
import { getDataSource } from '@/server/data';
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
      needs: ds.getNeedsYou(),
      actionClasses: Object.fromEntries(ds.getActionClasses().map((c) => [c.id, c])),
      events: ds.getEvents(),
      tracks: ds.getTracks(),
      running: cockpit.running,
      webhooks: cockpit.feed.webhooks,
      unattributed: cockpit.unattributed,
    },
  };
}
