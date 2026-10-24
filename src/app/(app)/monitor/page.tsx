import type { Metadata } from 'next';
import { loadMonitorData } from '@/app/features/monitor/data/loadMonitorData';
import { loadMonitorEstate } from '@/app/features/monitor/data/loadMonitorEstate';
import { MonitorScreen } from '@/app/features/monitor/MonitorScreen';
import { readDesk } from '@/server/runs/readDesk';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Monitor' };

// The fleet from the data source, and beside it (its own prop, never in FleetProject) the agents' spend read off the
// cycle runner's local files.
export default async function MonitorPage() {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const data = loadMonitorData();
  return <MonitorScreen data={data} estate={loadMonitorEstate(data, readDesk())} />;
}
