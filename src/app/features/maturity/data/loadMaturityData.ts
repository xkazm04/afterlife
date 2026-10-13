// What the Maturity layout needs, read through the data source on the server.
import type { DemoData } from '@/lib/demo';
import type { Stage } from '@/schemas';
import { getDataSource } from '@/server/data';

export function loadMaturityData(): { maturity: DemoData['maturity']; stages: readonly Stage[] } {
  const ds = getDataSource();
  return { maturity: ds.getMaturity(), stages: ds.getStages() };
}
