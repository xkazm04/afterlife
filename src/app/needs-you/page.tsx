import { loadNeedsYouView } from '../features/needs-you/data/pick';
import { NeedsYouEmpty } from '../features/needs-you/NeedsYouEmpty';
import { NeedsYouLive } from '../features/needs-you/NeedsYouLive';
import { NeedsYouScreen } from '../features/needs-you/NeedsYouScreen';

/**
 * Demo: the desk. Live: the group's own open items, or the empty state (never the demo's seeded desk). In live mode
 * `?item=<id>` opens that item selected (read on the client: Ladder's p sends `promote:<project>:<class>`).
 */
export default function NeedsYouPage() {
  const view = loadNeedsYouView();
  if (view.kind === 'desk') return <NeedsYouScreen demo={view.demo} />;
  if (view.kind === 'live') return <NeedsYouLive items={view.items} seeded={view.seeded} project={view.project} />;
  return <NeedsYouEmpty seeded={view.seeded} />;
}
