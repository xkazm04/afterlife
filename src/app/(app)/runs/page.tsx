import type { Metadata } from 'next';
import { RunsScreen } from '@/app/features/runs/RunsScreen';
import type { MergeNeed } from '@/lib/runs/desk/types';
import { readDeskAndRuns } from '@/server/runs/readDesk';
import { connection } from 'next/server';

export const metadata: Metadata = { title: 'Belay Runs' };

// Runs: read on every request, because the runner appends to these files while the page is open. The run files are
// read once, for the desk and the screen alike.
export default async function RunsPage() {
  await connection();
  const { desk, runs } = await readDeskAndRuns();
  const merges = desk.needs.filter((n): n is MergeNeed => n.kind === 'merge-wave');
  const fleetError = desk.fleet === 'invalid' ? (desk.fleetError ?? 'it did not parse') : undefined;
  return <RunsScreen data={runs} merges={merges} fleetError={fleetError} />;
}
