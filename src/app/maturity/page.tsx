import type { Metadata } from 'next';
import { MaturityScreen } from '../features/maturity/MaturityScreen';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Maturity' };

export default function MaturityPage() {
  return <MaturityScreen />;
}
