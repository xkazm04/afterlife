// Needs you's slices for the screen stream (GET /api/screen/<key>, docs/features/screen-host.md), in the order they fill:
//   view - what the screen draws (loadNeedsYouView: the demo's desk, the group's own items, or the empty state; in memory);
//   desk - the cycle runner's decisions (readDesk: the runner's local files and git, up to seconds), the list only.
// A decision's page answers notFound for live mode, the empty state or an id the desk does not hold (loadNeedsItem).
import { readDesk } from '@/server/runs/readDesk';
import { notFound, ok, type ModuleLoaders } from '@/app/features/screens/types';
import { loadNeedsItem, loadNeedsYouView } from '../data/pick';

export const loaders: ModuleLoaders = {
  'needs-you': {
    slices: {
      view: () => ok(loadNeedsYouView()),
      desk: async () => ok({ runner: (await readDesk()).needs }),
    },
  },
  'needs-you/[item]': {
    slices: {
      view: ({ params }) => {
        const view = loadNeedsItem(params.item ?? '');
        return view ? ok(view) : notFound();
      },
    },
  },
};
