import type { Metadata } from 'next';
import { loadMaturityData } from '../features/maturity/data/loadMaturityData';
import { MaturityScreen } from '../features/maturity/MaturityScreen';

export const metadata: Metadata = { title: 'Maturity' };

export default function MaturityPage() {
  return <MaturityScreen {...loadMaturityData()} />;
}
