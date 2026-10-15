// Reads the data source (demo fixture or live index) once, on the server, into the shape the front door needs.
import { getDataSource } from '@/server/data';
import { isSeeded } from '@/server/data/live/seeded';
import type { DoorData } from '../DoorScreen';

export function loadDoorData(): DoorData {
  const ds = getDataSource();
  const fleet = ds.getFleet();
  const portfolio = ds.getPortfolio();
  const cockpit = ds.getCockpit();
  const shown = (part: (typeof ds.illustrative)[number]) => ds.illustrative.includes(part);
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
      // live lists the group's own decisions only, as /needs-you does: the ids the demo seeds into an index are not its
      needs: ds.mode === 'live' ? ds.getNeedsYou().filter((n) => !isSeeded(n.id)) : ds.getNeedsYou(),
      tracks: ds.getTracks(),
      illustrative: { cockpit: shown('cockpit'), tracks: shown('tracks') },
    },
  };
}
