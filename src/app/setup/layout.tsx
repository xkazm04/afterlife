import type { ReactNode } from 'react';
import { loadSetupData } from '../features/setup/data/loadSetupData';
import { SetupProvider } from '../features/setup/hooks/SetupProvider';

/**
 * Live mode reads the tracks' arm blocks, the belay doctor and the steps from GitLab here, on the server, per load.
 * The layout persists across /setup and /setup/[node], so the flow state survives a trip to a node's page and back.
 */
export default async function SetupLayout({ children }: { children: ReactNode }) {
  return <SetupProvider {...await loadSetupData()}>{children}</SetupProvider>;
}
