import type { Metadata } from 'next';
import { loadFleetData } from '../features/fleet/data/loadFleetData';
import { FleetScreen } from '../features/fleet/FleetScreen';

export const metadata: Metadata = { title: 'Fleet' };

// Fleet: the demo fleet is read on the server and drawn by one client screen.
export default function FleetPage() {
  return <FleetScreen data={loadFleetData()} />;
}
