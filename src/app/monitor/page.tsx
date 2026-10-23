import type { Metadata } from 'next';
import { loadMonitorData } from '../features/monitor/data/loadMonitorData';
import { loadMonitorEstate } from '../features/monitor/data/loadMonitorEstate';
import { MonitorScreen } from '../features/monitor/MonitorScreen';
import { readDesk } from '@/server/runs/readDesk';

export const metadata: Metadata = { title: 'Belay Monitor' };

// The fleet from the data source, and beside it (its own prop, never in FleetProject) the agents' spend read off the
// cycle runner's local files.
export default function MonitorPage() {
  const data = loadMonitorData();
  return <MonitorScreen data={data} estate={loadMonitorEstate(data, readDesk())} />;
}
