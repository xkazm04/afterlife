import { getMaturity, getStages } from '@/lib/demo';
import { MaturityScreen } from '../features/maturity/MaturityScreen';

export default function MaturityPage() {
  return <MaturityScreen maturity={getMaturity()} stages={getStages()} />;
}
