// What the Onboard route needs, read through the data source on the server: the whole estate as the fleet sees it.
import { getDataSource } from '@/server/data';
import type { OnboardData } from '../model/build';

export function loadOnboardData(): OnboardData {
  const ds = getDataSource();
  const fleet = ds.getFleet();
  const portfolio = ds.getPortfolio();
  return {
    org: portfolio.group,
    host: 'gitlab.com',
    groups: fleet.groups,
    projects: fleet.projects,
    cycling: [ds.deepProjectId()],
    asOf: portfolio.asOf,
  };
}
