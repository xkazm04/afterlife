// The Monitor's slices for the screen stream (GET /api/screen/monitor), in the order the screen fills:
//   core   - the fleet (loadMonitorData): in memory, the first line; live before the first poll, its NotReadyError reason;
//   estate - stability and the 28-day trend (in memory, but the trend is the heavy part of the payload);
//   desk   - the agents' spend (readDesk: the runner's local files and git, up to seconds).
// Each reads on its own, so a slow desk never holds the fleet back.
import { readDesk } from '@/server/runs/readDesk';
import { ok, type ModuleLoaders } from '@/app/features/screens/types';
import { loadMonitorData } from '../data/loadMonitorData';
import { loadMonitorSignals, monitorCost } from '../data/loadMonitorEstate';

export const loaders: ModuleLoaders = {
  monitor: {
    slices: {
      core: () => ok(loadMonitorData()),
      estate: () => ok(loadMonitorSignals()),
      desk: async () => ok({ cost: monitorCost(loadMonitorData(), await readDesk()) }),
    },
  },
};
