import type { Metadata } from 'next';
import { loadSetupData } from '../features/setup/data/loadSetupData';
import { SetupScreen } from '../features/setup/SetupScreen';

export const metadata: Metadata = { title: 'Setup' };

export default function SetupPage() {
  return <SetupScreen {...loadSetupData()} />;
}
