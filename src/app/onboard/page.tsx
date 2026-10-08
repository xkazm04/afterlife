import type { Metadata } from 'next';
import { loadOnboardData } from '../features/onboard/data/loadOnboardData';
import { OnboardScreen } from '../features/onboard/OnboardScreen';

export const metadata: Metadata = { title: 'Onboard' };

type Search = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

// Onboard: the whole estate as the fleet sees it, read on the server; the funnel and the batch run in the client.
// ?preview=1 opens with the next batch's commands shown.
export default async function OnboardPage({ searchParams }: Search) {
  const preview = one((await searchParams).preview) === '1';
  return <OnboardScreen key={String(preview)} data={loadOnboardData()} startPreview={preview} />;
}
