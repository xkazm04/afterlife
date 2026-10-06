import type { Metadata } from 'next';
import { KitScreen } from '../features/kit/KitScreen';

export const metadata: Metadata = { title: 'Belay kit', robots: { index: false } };

/** Dev gallery of the shared components. Not linked from the navigation. */
export default function KitPage() {
  return <KitScreen />;
}
