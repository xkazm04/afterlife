import type { Metadata } from 'next';
import { firstParam } from '@/lib/url/searchParams';
import { loadOnboardData } from '@/app/features/onboard/data/loadOnboardData';
import { OnboardScreen } from '@/app/features/onboard/OnboardScreen';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Onboard' };

type Search = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

// Onboard: the whole estate as the fleet sees it, read on the server; the funnel and the batch run in the client.
// ?preview=1 opens with the next batch's commands shown.
export default async function OnboardPage({ searchParams }: Search) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const preview = firstParam((await searchParams).preview) === '1';
  return <OnboardScreen key={String(preview)} data={loadOnboardData()} startPreview={preview} />;
}
