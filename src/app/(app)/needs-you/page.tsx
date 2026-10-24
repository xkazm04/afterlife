import type { Metadata } from 'next';
import { loadNeedsYouView } from '@/app/features/needs-you/data/pick';
import { NeedsYouEmpty } from '@/app/features/needs-you/NeedsYouEmpty';
import { NeedsYouLive } from '@/app/features/needs-you/NeedsYouLive';
import { NeedsYouScreen } from '@/app/features/needs-you/NeedsYouScreen';
import { readDesk } from '@/server/runs/readDesk';
import { connection } from 'next/server';

export const metadata: Metadata = { title: 'Belay Needs you' };

/**
 * Demo: the desk. Live: the group's own open items, or the empty state (never the demo's seeded desk). In live mode
 * `?item=<id>` opens that item selected (read on the client: Ladder's p sends `promote:<project>:<class>`). In every
 * view, the cycle runner's decisions (readDesk: .belay, real local data) sit beside the group's.
 */
export default async function NeedsYouPage() {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const view = loadNeedsYouView();
  const runner = readDesk().needs;
  if (view.kind === 'desk') return <NeedsYouScreen demo={view.demo} runner={runner} />;
  if (view.kind === 'live') {
    return <NeedsYouLive items={view.items} seeded={view.seeded} project={view.project} evidence={view.evidence} decided={view.decided} now={view.now} runner={runner} />;
  }
  return <NeedsYouEmpty seeded={view.seeded} demo={view.demo} runner={runner} />;
}
