// Onboard's slices for the screen stream (GET /api/screen/<key>):
//   onboard/estate  core - the estate as the fleet sees it (loadOnboardData, in memory).
// The wizard's "Your repos" moved with the wizard to /start (features/start/screen/slices.ts).
import { ok, type ModuleLoaders } from '@/app/features/screens/types';
import { loadOnboardData } from '../data/loadOnboardData';

export const loaders: ModuleLoaders = {
  'onboard/estate': {
    slices: { core: () => ok(loadOnboardData()) },
  },
};
