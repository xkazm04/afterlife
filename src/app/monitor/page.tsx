import { loadMonitorData } from '../features/monitor/data/loadMonitorData';
import { MonitorScreen } from '../features/monitor/MonitorScreen';

export default function MonitorPage() {
  return <MonitorScreen data={loadMonitorData()} />;
}
