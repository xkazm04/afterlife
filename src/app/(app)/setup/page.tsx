import type { Metadata } from 'next';
import { SetupScreen } from '@/app/features/setup/SetupScreen';

export const metadata: Metadata = { title: 'Afterlife · Setup' };

export default function SetupPage() {
  return <SetupScreen />;
}
