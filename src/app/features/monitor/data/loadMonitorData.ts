// Reads the data source (demo fixture or live index) once, on the server, into the shape the Monitor needs.
import { getDataSource } from '@/server/data';
import { isSeeded } from '@/server/data/live/seeded';
import { visibleNeeds } from '../model/mode';
import type { MonitorData } from '../model/types';

export function loadMonitorData(): MonitorData {
  const ds = getDataSource();
  const fleet = ds.getFleet();
  const portfolio = ds.getPortfolio();
  return {
    mode: ds.mode,
    org: portfolio.group,
    asOf: portfolio.asOf,
    groups: fleet.groups,
    projects: fleet.projects,
    stages: ds.getStages(),
    deepId: ds.deepProjectId(),
    needs: visibleNeeds(ds.mode, ds.getNeedsYou(), isSeeded),
    lastPollSec: ds.getCockpit().feed.lastPollSec,
  };
}
