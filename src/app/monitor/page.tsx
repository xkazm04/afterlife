import type { Metadata } from 'next';
import { loadMonitorData } from '../features/monitor/data/loadMonitorData';
import { MonitorScreen } from '../features/monitor/MonitorScreen';

export const metadata: Metadata = { title: 'Monitor' };

export default function MonitorPage() {
  return <MonitorScreen data={loadMonitorData()} />;
}
