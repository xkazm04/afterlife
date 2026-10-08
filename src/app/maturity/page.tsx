import { getDataSource } from '@/server/data';
import { loadMaturityData } from '../features/maturity/data/loadMaturityData';
import { MaturityScreen } from '../features/maturity/MaturityScreen';

/** The project a gap's MR is opened in and the data mode come from the data source here: in live mode the gaps' files are still demo fixtures, and the screen never sends those. */
export default function MaturityPage() {
  const ds = getDataSource();
  return <MaturityScreen {...loadMaturityData()} project={ds.deepProjectId()} mode={ds.mode} />;
}
