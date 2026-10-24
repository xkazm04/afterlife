import type { Metadata } from 'next';
import { MaturityScreen } from '@/app/features/maturity/MaturityScreen';

export const metadata: Metadata = { title: 'Belay Maturity' };

export default function MaturityPage() {
  return <MaturityScreen />;
}
