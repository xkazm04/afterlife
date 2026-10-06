// What the Setup route needs, read through the data source on the server.
import type { ComponentProps } from 'react';
import { getDataSource } from '@/server/data';
import type { SetupScreen } from '../SetupScreen';

export function loadSetupData(): ComponentProps<typeof SetupScreen> {
  const ds = getDataSource();
  return { setup: ds.getSetup(), tracks: ds.getTracks(), classes: ds.getActionClasses() };
}
