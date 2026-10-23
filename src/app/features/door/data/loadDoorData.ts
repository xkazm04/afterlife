// Reads the data source (demo fixture or live index) once, on the server, into the shape the front door needs.
import { loadEstateData } from '@/app/features/cycles/data/loadEstateData';
import { getDataSource } from '@/server/data';
import { ownDecisions } from '@/server/data/live/seeded';
import type { DoorData } from '../DoorScreen';

export function loadDoorData(): DoorData {
  const ds = getDataSource();
  const fleet = ds.getFleet();
  const portfolio = ds.getPortfolio();
  const cockpit = ds.getCockpit();
  const shown = (part: (typeof ds.illustrative)[number]) => ds.illustrative.includes(part);
  // the line is the way into /cycles, so it counts what /cycles counts: every project with a closed cycle, and their net rungs
  const estate = loadEstateData();
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
      needs: ownDecisions(ds.mode, ds.getNeedsYou()),
      tracks: ds.getTracks(),
      illustrative: { cockpit: shown('cockpit'), tracks: shown('tracks') },
    },
    cycles: { projects: estate.inCycles, gained: estate.sum.net },
  };
}
