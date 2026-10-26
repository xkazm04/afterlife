// Cycles' slices for the screen stream (GET /api/screen/cycles), in the order the screen fills. One key for both scopes:
// the page's ?scope= decides what each slice reads, and a slice the scope does not draw answers an empty object.
//   core         - the project's cycles (loadCyclesData: the Maturity scan joined to the closed cycles); scope project;
//   estate       - the estate's groups, numbers and project rows, without their cycles; scope estate;
//   estateCycles - every project's closed cycles (the heavy part), for the estate inspector's "Every cycle".
import { ok, type ModuleLoaders, type SliceCtx } from '@/app/features/screens/types';
import { loadCyclesData } from '../data/loadCyclesData';
import { loadEstateData } from '../data/loadEstateData';
import { estateCycles, estateSummary } from '../model/estate/split';

const isEstate = (c: SliceCtx): boolean => c.search.get('scope') === 'estate';

export const loaders: ModuleLoaders = {
  cycles: {
    slices: {
      core: (c) => ok(isEstate(c) ? {} : loadCyclesData()),
      estate: (c) => ok(isEstate(c) ? estateSummary(loadEstateData()) : {}),
      estateCycles: (c) => ok(isEstate(c) ? estateCycles(loadEstateData()) : {}),
    },
  },
};
