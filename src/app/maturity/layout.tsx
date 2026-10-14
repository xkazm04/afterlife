import type { ReactNode } from 'react';
import { getDataSource } from '@/server/data';
import { loadMaturityData } from '../features/maturity/data/loadMaturityData';
import { MaturityProvider } from '../features/maturity/MaturityProvider';

/**
 * The project a gap's MR is opened in and the data mode come from the data source here: in live mode the screens name the
 * project, hide the fixtures that would pass for its own and mark the gaps' files demo, and never send those. The state
 * lives in the layout, so the crag and a stage's page are one session.
 */
export default function MaturityLayout({ children }: { children: ReactNode }) {
  const ds = getDataSource();
  return (
    <MaturityProvider {...loadMaturityData()} project={ds.deepProjectId()} mode={ds.mode}>
      {children}
    </MaturityProvider>
  );
}
