// Setup's slices for the screen stream (GET /api/screen/setup and setup%2F%5Bnode%5D), in the order the screen fills:
//   catalogue - the steps, the tracks and their arm order, the classes, start_tier (in memory, the first line); live
//               adds who the reads are for. A /setup/<node> the catalogue does not hold answers notFound here.
//   tracks    - live: each track's arm block on the target's main (checkArm, a GitLab read per track);
//   doctor    - live: the belay doctor's capability probe (eleven GitLab reads);
//   steps     - live: the observable steps (glab login, the projects, the runner, the protections, ...).
// The three live reads are independent: each is written the moment it resolves. The demo makes none of them: its
// catalogue is the whole state, and each read slice answers an empty object (the screen applies nothing).
import { getDataSource } from '@/server/data';
import { notFound, ok, type ModuleLoaders, type ScreenLoader } from '@/app/features/screens/types';
import { loadSetupNode } from '../data/loadSetupNode';
import type { SetupCatalogue } from '../model/arrive/arrive';

function catalogue(): SetupCatalogue {
  const ds = getDataSource();
  const reads = ds.setupReads();
  const startTier = ds.getPolicy()?.startTier;
  return {
    setup: ds.getSetup(),
    tracks: [...ds.getTracks()],
    classes: [...ds.getActionClasses()],
    illustrative: { steps: ds.illustrative.includes('setup'), tracks: ds.illustrative.includes('tracks') },
    mode: ds.mode === 'live' ? 'live' : 'demo',
    ...(startTier ? { startTier } : {}),
    ...(reads ? { live: { group: reads.group, host: reads.host, project: reads.project, projects: [...reads.projects] } } : {}),
  };
}

const reads = () => getDataSource().setupReads();

const setup = (node: boolean): ScreenLoader => ({
  slices: {
    catalogue: ({ params }) => (node && !loadSetupNode(params.node ?? '') ? notFound() : ok(catalogue())),
    tracks: async () => {
      const r = reads();
      return ok(r ? await r.tracks(getDataSource().getSetup().arm.map(([id]) => id)) : {});
    },
    doctor: async () => {
      const r = reads();
      return ok(r ? await r.doctor() : {});
    },
    steps: async () => {
      const r = reads();
      return ok(r ? await r.steps() : {});
    },
  },
});

export const loaders: ModuleLoaders = {
  setup: setup(false),
  'setup/[node]': setup(true),
};
