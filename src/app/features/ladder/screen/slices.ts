// The Ladder's slices for the screen stream (GET /api/screen/<key>, docs/features/screen-host.md), in the order they fill:
//   core     - the classes, tracks, policy, tier meanings, the head, the zone (in memory, the first line);
//   ledger   - the moves and the guardrail's quotes (live: the project's belay-ledger chain, the big one);
//   humanKey - the class page only: the human key on belay-policy (live: a GitLab read), its own late slice.
// A class page answers notFound for a class the data source does not hold.
import { notFound, ok, type ModuleLoaders } from '@/app/features/screens/types';
import { loadHumanKey } from '../data/loadLadderClass';
import { loadLadderData } from '../data/loadLadderData';

function core() {
  const { seed, ...rest } = loadLadderData();
  const { ledger: _ledger, quotes: _quotes, ...seedCore } = seed;
  void _ledger;
  void _quotes;
  return { ...rest, seed: seedCore };
}

function ledger() {
  const { seed } = loadLadderData();
  return ok({ ledger: seed.ledger, quotes: seed.quotes });
}

export const loaders: ModuleLoaders = {
  ladder: { slices: { core: () => ok(core()), ledger } },
  'ladder/[class]': {
    slices: {
      core: ({ params }) => {
        const data = core();
        return data.seed.classes.some((c) => c.id === params.class) ? ok(data) : notFound();
      },
      ledger,
      humanKey: async () => ok(await loadHumanKey()),
    },
  },
};
