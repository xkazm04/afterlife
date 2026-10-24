import { Suspense, type ReactNode } from 'react';
import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';
import { getDataSource } from '@/server/data';
import { loadMaturityData } from '@/app/features/maturity/data/loadMaturityData';
import { MaturityProvider } from '@/app/features/maturity/MaturityProvider';
import { connection } from 'next/server';

/**
 * The project a gap's MR is opened in and the data mode come from the data source here: in live mode the screens name the
 * project, hide the fixtures that would pass for its own and mark the gaps' files demo, and never send those. The state
 * lives in the layout, so the crag and a stage's page are one session. The read streams behind the crag's skeleton, so
 * the layout never holds a navigation; the provider mounts once and stays while the viewer moves between its pages.
 */
export default function MaturityLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ScreenSkeleton title="Maturity" layout="grid" />}>
      <MaturitySession>{children}</MaturitySession>
    </Suspense>
  );
}

async function MaturitySession({ children }: { children: ReactNode }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const ds = getDataSource();
  return (
    <MaturityProvider {...loadMaturityData()} project={ds.deepProjectId()} mode={ds.mode}>
      {children}
    </MaturityProvider>
  );
}
