import type { Metadata } from 'next';
import { MaturityScreen } from '@/app/features/maturity/MaturityScreen';

export const metadata: Metadata = { title: 'Afterlife · Maturity' };

export default function MaturityPage() {
  return <MaturityScreen />;
}
