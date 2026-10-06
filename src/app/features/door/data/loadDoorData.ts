// Reads the data source (demo fixture or live index) once, on the server, into the shape the front door needs.
import { getDataSource } from '@/server/data';
import type { DoorData } from '../DoorScreen';

export function loadDoorData(): DoorData {
  const ds = getDataSource();
  const fleet = ds.getFleet();
  const portfolio = ds.getPortfolio();
  const cockpit = ds.getCockpit();
  return {
    org: portfolio.group,
    asOf: portfolio.asOf,
    groups: fleet.groups,
    classes: fleet.classes,
    stages: ds.getStages(),
    projects: fleet.projects,
    deep: {
      id: ds.deepProjectId(),
      cockpit: { running: cockpit.running, doingNow: cockpit.doingNow, goingWell: cockpit.goingWell, needsMe: cockpit.needsMe },
      needs: ds.getNeedsYou(),
      tracks: ds.getTracks(),
    },
  };
}
