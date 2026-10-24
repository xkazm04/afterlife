import type { Metadata } from 'next';
import { SetupScreen } from '../features/setup/SetupScreen';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Setup' };

export default function SetupPage() {
  return <SetupScreen />;
}
