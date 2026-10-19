import { RunsScreen } from '../features/runs/RunsScreen';
import type { MergeNeed } from '@/lib/runs/desk/types';
import { readDesk } from '@/server/runs/readDesk';
import { readRuns } from '@/server/runs/readRuns';

// Runs: read on every request, because the runner appends to these files while the page is open.
export const dynamic = 'force-dynamic';

export default function RunsPage() {
  const merges = readDesk().needs.filter((n): n is MergeNeed => n.kind === 'merge-wave');
  return <RunsScreen data={readRuns()} merges={merges} />;
}
