import type { Metadata } from 'next';
import { MaturityScreen } from '../features/maturity/MaturityScreen';

export const metadata: Metadata = { title: 'Belay Maturity' };

export default function MaturityPage() {
  return <MaturityScreen />;
}
