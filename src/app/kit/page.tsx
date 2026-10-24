import type { Metadata } from 'next';
import { KitScreen } from '../features/kit/KitScreen';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay kit', robots: { index: false } };

/** Dev gallery of the shared components. Not linked from the navigation. */
export default function KitPage() {
  return <KitScreen />;
}
