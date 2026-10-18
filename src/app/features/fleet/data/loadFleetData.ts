// Reads the data source (demo fixture or live index) once, on the server, into the shape the Fleet screen needs. What
// the two sources serve differently on purpose (the mode, the recent events) is `loadFleetSource`, beside this one. The
// deep project's decisions, tasks and tracks are read for its own page only (`loadFleetProject`).
import { getDataSource } from '@/server/data';
import { acceptedLabel } from '../model/inspector';
import type { FleetData } from '../model/types';

export function loadFleetData(): FleetData {
  const ds = getDataSource();
  const fleet = ds.getFleet();
  return {
    portfolio: ds.getPortfolio().group,
    projects: fleet.projects,
    groups: fleet.groups,
    classes: fleet.classes,
    stages: ds.getStages(),
    tiers: ds.getTiers(),
    lastPollSec: ds.getCockpit().feed.lastPollSec,
    deepId: ds.deepProjectId(),
    records: Object.fromEntries(ds.getActionClasses().flatMap((c) => (acceptedLabel(c) ? [[c.id, acceptedLabel(c)]] : []))),
  };
}
