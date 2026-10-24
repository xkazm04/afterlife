import type { ReactNode } from 'react';
import { loadSetupData } from '@/app/features/setup/data/loadSetupData';
import { SetupProvider } from '@/app/features/setup/hooks/SetupProvider';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Live mode reads the tracks' arm blocks, the belay doctor and the steps from GitLab here, on the server, per load.
 * The layout persists across /setup and /setup/[node], so the flow state survives a trip to a node's page and back.
 */
export default async function SetupLayout({ children }: { children: ReactNode }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  return <SetupProvider {...await loadSetupData()}>{children}</SetupProvider>;
}
