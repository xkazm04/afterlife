// What the Cycles route needs, read through the data source on the server: the Maturity scan and gaps, joined to the
// closed-cycle history (a screen fixture, like Maturity's credit history).
import { getDataSource } from '@/server/data';
import { buildCycles, type CyclesData } from '../model/build';
import { CADENCE_DAYS, CLOSED_CYCLES, TODAY } from './history';

export function loadCyclesData(): CyclesData {
  const ds = getDataSource();
  return buildCycles(ds.getMaturity(), CLOSED_CYCLES, { project: 'acme-lab/ledgerline', today: TODAY, cadence: CADENCE_DAYS });
}
