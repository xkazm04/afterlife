import type { Metadata } from 'next';
import { KitScreen } from '@/app/features/kit/KitScreen';

export const metadata: Metadata = { title: 'Afterlife · Kit', robots: { index: false } };

/** Dev gallery of the shared components. Not linked from the navigation. */
export default function KitPage() {
  return <KitScreen />;
}
