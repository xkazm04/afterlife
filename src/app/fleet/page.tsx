import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loadFleetData } from '../features/fleet/data/loadFleetData';
import { loadFleetSource } from '../features/fleet/data/loadFleetSource';
import { FleetScreen } from '../features/fleet/FleetScreen';
import { decodeListState, type RawParams } from '../features/fleet/model/list/urlState';
import { readDesk } from '@/server/runs/readDesk';

export const metadata: Metadata = { title: 'Belay Fleet' };

// Fleet: the fleet is read from the data source on the server and drawn by one client screen. The view state (filters, sort,
// view, search) comes from the URL, so the server render and the first client render agree and Back restores the screen.
// The cycle runner's strip is read beside it (readDesk: .belay/fleet.yml, .belay/runs and git), real local data in both modes.
// `?project=<id>` (the command palette's project links) opens that project's page, /fleet/<id>.
export default async function FleetPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const want = Array.isArray(params.project) ? params.project[0] : params.project;
  const data = loadFleetData();
  if (want && data.projects.some((p) => p.id === want)) redirect(`/fleet/${encodeURIComponent(want)}`);
  return <FleetScreen data={data} source={loadFleetSource()} start={decodeListState(params)} runner={readDesk()} />;
}
