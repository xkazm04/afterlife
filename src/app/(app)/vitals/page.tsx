import type { Metadata } from 'next';
import { loadVitalsList } from '@/app/features/vitals/data/loadVitals';
import { VitalsListScreen } from '@/app/features/vitals/VitalsListScreen';
import { connection } from 'next/server';

export const metadata: Metadata = { title: 'Belay Vitals' };

// Vitals: the real projects Afterlife watches (.belay/projects), each with what was collected for it. Read on every
// request: onboarding and collecting write these files while the app is open.
export default async function VitalsPage() {
  await connection(); // request time: the data directory is the running server's, never the build's
  return <VitalsListScreen projects={loadVitalsList()} now={new Date().toISOString()} />;
}
