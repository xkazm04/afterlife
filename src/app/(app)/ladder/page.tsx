import type { Metadata } from 'next';
import { loadLadderData } from '@/app/features/ladder/data/loadLadderData';
import { LadderScreen } from '@/app/features/ladder/LadderScreen';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Ladder' };

export default async function LadderPage() {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  return <LadderScreen {...loadLadderData()} />;
}
