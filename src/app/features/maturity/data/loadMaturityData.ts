// What the Maturity route needs, read through the data source on the server.
import type { ComponentProps } from 'react';
import { getDataSource } from '@/server/data';
import type { MaturityScreen } from '../MaturityScreen';

export function loadMaturityData(): ComponentProps<typeof MaturityScreen> {
  const ds = getDataSource();
  return { maturity: ds.getMaturity(), stages: ds.getStages() };
}
