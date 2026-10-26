import { Suspense, type ReactNode } from 'react';
import { SetupLayoutSkeleton } from '@/app/features/setup/components/SetupSkeleton';
import { loadSetupData } from '@/app/features/setup/data/loadSetupData';
import { SetupProvider } from '@/app/features/setup/hooks/SetupProvider';
import { connection } from 'next/server';

/**
 * Live mode reads the tracks' arm blocks, the doctor and the steps from GitLab here, on the server, per load.
 * That read streams: the Setup window's skeleton paints at once and the flow fills it in. The layout (and the provider
 * inside its Suspense) persists across /setup and /setup/[node], so the flow state survives a trip to a node's page and back.
 */
export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<SetupLayoutSkeleton />}>
      <SetupFlow>{children}</SetupFlow>
    </Suspense>
  );
}

async function SetupFlow({ children }: { children: ReactNode }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  return <SetupProvider {...await loadSetupData()}>{children}</SetupProvider>;
}
