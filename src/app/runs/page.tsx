import { RunsScreen } from '../features/runs/RunsScreen';
import { readRuns } from '@/server/runs/readRuns';

// Runs: read on every request, because the runner appends to these files while the page is open.
export const dynamic = 'force-dynamic';

export default function RunsPage() {
  return <RunsScreen data={readRuns()} />;
}
