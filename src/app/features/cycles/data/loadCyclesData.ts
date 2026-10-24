// What the Cycles route needs, read through the data source on the server: the Maturity scan and gaps, joined to the
// closed cycles the project's ledger records (belay-ledger/cycles/<id>.jsonl; in demo mode, the same history). The
// project is named as the source names it (its group / the deep project), so a live report never says the demo's name.
import { getDataSource } from '@/server/data';
import { buildCycles, type CyclesData } from '../model/build';

export function loadCyclesData(): CyclesData {
  const ds = getDataSource();
  const h = ds.getCycles();
  const project = `${ds.getPortfolio().group}/${ds.deepProjectId()}`;
  return buildCycles(ds.getMaturity(), h.cycles, { project, today: h.today, cadence: h.cadence });
}
