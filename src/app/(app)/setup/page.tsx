import type { Metadata } from 'next';
import { SetupScreen } from '@/app/features/setup/SetupScreen';

export const metadata: Metadata = { title: 'Belay Setup' };

export default function SetupPage() {
  return <SetupScreen />;
}
