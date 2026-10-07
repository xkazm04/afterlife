import type { Metadata } from 'next';
import { loadOnboardData } from '../features/onboard/data/loadOnboardData';
import { OnboardScreen } from '../features/onboard/OnboardScreen';

export const metadata: Metadata = { title: 'Onboard' };

// Onboard: the whole estate as the fleet sees it, read on the server; the funnel and the batch run in the client.
export default function OnboardPage() {
  return <OnboardScreen data={loadOnboardData()} />;
}
