// Fleet's slices for the screen stream (GET /api/screen/<key>, docs/features/screen-host.md), in the order the screen fills:
//   fleet            core   - the fleet and its source (in memory, the first line); `?project=<id>` of a project the
//                             fleet has redirects to /fleet/<id> (the palette's project links);
//                    estate - stability and the 28-day trend (in memory, but the trend is the heavy part of the payload);
//                    desk   - the cycle runner's strip and its spend on the projects (readDesk: local files and git).
//   fleet/[project]  core   - the project, its view and the fleet's column names (not the other projects); notFound for
//                             an id the fleet does not have;
//                    estate - this project's stability and its own trend rows only;
//                    desk   - the runner's spend joined onto the fleet (the Cost card reads this project's).
// The list state (filters, sort, view) is the client's: it decodes it from the URL itself, nothing of it is streamed.
import { readDesk } from '@/server/runs/readDesk';
import { fleetHref } from '@/lib/url/fleetHref';
import { notFound, ok, redirectTo, type ModuleLoaders } from '@/app/features/screens/types';
import { loadFleetData } from '../data/loadFleetData';
import { fleetCost, loadFleetSignals, projectSignals } from '../data/loadFleetEstate';
import { loadFleetProject, projectCore } from '../data/loadFleetProject';
import { loadFleetSource } from '../data/loadFleetSource';
import type { FleetCore, FleetDesk, ProjectDesk } from '../model/screen/slices';

const desk = async (): Promise<FleetDesk> => {
  const runner = await readDesk();
  return { runner, cost: fleetCost(loadFleetData(), runner) };
};

export const loaders: ModuleLoaders = {
  fleet: {
    slices: {
      core: ({ search }) => {
        const data = loadFleetData();
        const want = search.get('project');
        if (want && data.projects.some((p) => p.id === want)) return redirectTo(fleetHref(want));
        return ok({ data, source: loadFleetSource() } satisfies FleetCore);
      },
      estate: () => ok(loadFleetSignals()),
      desk: async () => ok(await desk()),
    },
  },
  'fleet/[project]': {
    slices: {
      core: ({ params }) => {
        const view = loadFleetProject(params.project ?? '');
        return view ? ok(projectCore(view)) : notFound();
      },
      estate: ({ params }) => ok(projectSignals(params.project ?? '')),
      desk: async () => ok({ cost: (await desk()).cost } satisfies ProjectDesk),
    },
  },
};
