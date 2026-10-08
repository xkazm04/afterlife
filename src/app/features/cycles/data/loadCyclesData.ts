// What the Cycles route needs, read through the data source on the server: the Maturity scan and gaps, joined to the
// closed cycles the project's ledger records (belay-ledger/cycles/<id>.jsonl; in demo mode, the same history).
import { getDataSource } from '@/server/data';
import { buildCycles, type CyclesData } from '../model/build';

export function loadCyclesData(): CyclesData {
  const ds = getDataSource();
  const h = ds.getCycles();
  return buildCycles(ds.getMaturity(), h.cycles, { project: 'acme-lab/ledgerline', today: h.today, cadence: h.cadence });
}
