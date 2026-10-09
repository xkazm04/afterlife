import { getDataSource } from '@/server/data';
import { loadMaturityData } from '../features/maturity/data/loadMaturityData';
import { MaturityScreen } from '../features/maturity/MaturityScreen';

/** The project a gap's MR is opened in and the data mode come from the data source here: in live mode the screen names the project, hides the fixtures that would pass for its own and marks the gaps' files demo, and never sends those. */
export default function MaturityPage() {
  const ds = getDataSource();
  return <MaturityScreen {...loadMaturityData()} project={ds.deepProjectId()} mode={ds.mode} />;
}
