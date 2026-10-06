import { loadMaturityData } from '../features/maturity/data/loadMaturityData';
import { MaturityScreen } from '../features/maturity/MaturityScreen';

export default function MaturityPage() {
  return <MaturityScreen {...loadMaturityData()} />;
}
