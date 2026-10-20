// The estate scope of Cycles, read through the data source on the server: the fleet's projects and groups joined to
// every project's closed cycles (each read from its ledger in live mode).
import { getDataSource } from '@/server/data';
import { buildEstate, type EstateData } from '../model/estate/estate';

export function loadEstateData(): EstateData {
  const ds = getDataSource();
  const fleet = ds.getFleet();
  return buildEstate(ds.getPortfolio().group, ds.deepProjectId(), fleet.groups, fleet.projects, ds.getEstateCycles());
}
