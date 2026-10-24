import type { Metadata } from 'next';
import { RunsScreen } from '../features/runs/RunsScreen';
import type { MergeNeed } from '@/lib/runs/desk/types';
import { readDesk } from '@/server/runs/readDesk';
import { readRuns } from '@/server/runs/readRuns';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Runs' };

// Runs: read on every request, because the runner appends to these files while the page is open.
export default async function RunsPage() {
  await connection();
  const merges = readDesk().needs.filter((n): n is MergeNeed => n.kind === 'merge-wave');
  return <RunsScreen data={readRuns()} merges={merges} />;
}
