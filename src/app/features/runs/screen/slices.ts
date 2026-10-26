// Runs' slices for the screen stream (GET /api/screen/runs), in the order the screen fills:
//   runs   - readRuns over .afterlife/runs (fs, fast): the same data GET /api/runs serves;
//   merges - the desk's merge-wave decisions and fleet.yml's error (readDeskAndRuns: git per mergeable wave, up to
//            seconds). Loopback only: its commands name this machine's checkouts.
import { ok, type ModuleLoaders } from '@/app/features/screens/types';
import type { MergeNeed } from '@/lib/runs/desk/types';
import { readDeskAndRuns } from '@/server/runs/readDesk';
import { readRuns } from '@/server/runs/readRuns';

export const loaders: ModuleLoaders = {
  runs: {
    local: ['merges'],
    slices: {
      runs: () => ok(readRuns()),
      merges: async () => {
        const { desk } = await readDeskAndRuns();
        const merges = desk.needs.filter((n): n is MergeNeed => n.kind === 'merge-wave');
        return ok(desk.fleet === 'invalid' ? { merges, fleetError: desk.fleetError ?? 'it did not parse' } : { merges });
      },
    },
  },
};
