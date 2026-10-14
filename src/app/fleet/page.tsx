import { loadFleetData } from '../features/fleet/data/loadFleetData';
import { loadFleetSource } from '../features/fleet/data/loadFleetSource';
import { FleetScreen } from '../features/fleet/FleetScreen';
import { decodeListState, type RawParams } from '../features/fleet/model/list/urlState';

// Fleet: the fleet is read from the data source on the server and drawn by one client screen. The view state (filters, sort,
// view, search) comes from the URL, so the server render and the first client render agree and Back restores the screen.
export default async function FleetPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const start = decodeListState(await searchParams);
  return <FleetScreen data={loadFleetData()} source={loadFleetSource()} start={start} />;
}
