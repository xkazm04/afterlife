import { loadFleetData } from '../features/fleet/data/loadFleetData';
import { loadFleetSource } from '../features/fleet/data/loadFleetSource';
import { FleetScreen } from '../features/fleet/FleetScreen';

// Fleet: the fleet is read from the data source on the server and drawn by one client screen.
export default function FleetPage() {
  return <FleetScreen data={loadFleetData()} source={loadFleetSource()} />;
}
