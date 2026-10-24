import type { ReactNode } from 'react';
import { getDataSource } from '@/server/data';
import { loadMaturityData } from '@/app/features/maturity/data/loadMaturityData';
import { MaturityProvider } from '@/app/features/maturity/MaturityProvider';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * The project a gap's MR is opened in and the data mode come from the data source here: in live mode the screens name the
 * project, hide the fixtures that would pass for its own and mark the gaps' files demo, and never send those. The state
 * lives in the layout, so the crag and a stage's page are one session.
 */
export default async function MaturityLayout({ children }: { children: ReactNode }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const ds = getDataSource();
  return (
    <MaturityProvider {...loadMaturityData()} project={ds.deepProjectId()} mode={ds.mode}>
      {children}
    </MaturityProvider>
  );
}
