import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { loadFleetData } from '@/app/features/fleet/data/loadFleetData';
import { loadFleetEstate } from '@/app/features/fleet/data/loadFleetEstate';
import { loadFleetSource } from '@/app/features/fleet/data/loadFleetSource';
import { FleetScreen } from '@/app/features/fleet/FleetScreen';
import { decodeListState, type RawParams } from '@/app/features/fleet/model/list/urlState';
import { fleetHref } from '@/lib/url/fleetHref';
import { firstParam } from '@/lib/url/searchParams';
import { readDesk } from '@/server/runs/readDesk';

// The fleet list's request-time half, streamed into page.tsx's <Suspense>. The fleet is read from the data source and drawn
// by one client screen. The view state (filters, sort, view, search) comes from the URL, so the server render and the first
// client render agree and Back restores the screen. The cycle runner's strip is read beside it (readDesk: .belay/fleet.yml,
// .belay/runs and git), real local data in both modes, and joined onto the projects as their agent cost (loadFleetEstate),
// passed as its own prop. `?project=<id>` (the command palette's project links) opens that project's page, /fleet/<id>.
export async function FleetList({ searchParams }: { searchParams: Promise<RawParams> }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const params = await searchParams;
  const want = firstParam(params.project);
  const data = loadFleetData();
  if (want && data.projects.some((p) => p.id === want)) redirect(fleetHref(want));
  const runner = readDesk();
  return <FleetScreen data={data} source={loadFleetSource()} start={decodeListState(params)} runner={runner} estate={loadFleetEstate(data, runner)} />;
}
