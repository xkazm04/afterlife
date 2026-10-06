// Reads the demo fixture once, on the server, into the shape the Fleet screen needs.
import { getActionClasses, getCockpit, getEvents, getFleet, getNeedsYou, getPortfolio, getStages, getTiers, getTracks, LEDGERLINE_ID } from '@/lib/demo';
import type { FleetData } from '../model/types';

export function loadFleetData(): FleetData {
  const fleet = getFleet();
  const cockpit = getCockpit();
  return {
    portfolio: getPortfolio().group,
    projects: fleet.projects,
    groups: fleet.groups,
    classes: fleet.classes,
    stages: getStages(),
    tiers: getTiers(),
    lastPollSec: cockpit.feed.lastPollSec,
    deep: {
      id: LEDGERLINE_ID,
      needs: getNeedsYou(),
      actionClasses: Object.fromEntries(getActionClasses().map((c) => [c.id, c])),
      events: getEvents(),
      tracks: getTracks(),
      running: cockpit.running,
      webhooks: cockpit.feed.webhooks,
      unattributed: cockpit.unattributed,
    },
  };
}
