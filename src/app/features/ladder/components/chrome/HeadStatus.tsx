import type { TiersStale as Stale } from '@/server/data/types';
import { livePollAge, pollAge } from '../../model/clock';
import type { Head } from '../../model/types';
import { DemoChip } from './DemoChip';
import { TiersStale } from './TiersStale';

/**
 * The status line's tail on the list and the class page, said once for both: the tier-state.yml head (marked demo when it
 * is the demo's), the stale tiers mark, and how old the poll is. Demo: the simulated poll's age wraps every 15 s; live:
 * the snapshot's age counts up from the page load (`elapsed` seconds ago).
 */
export function HeadStatus({ head, stale, live, elapsed, feedAgeSec }: { head: Head; stale: Stale | null; live: boolean; elapsed: number; feedAgeSec: number }) {
  const age = live ? livePollAge(elapsed, feedAgeSec) : pollAge(elapsed, feedAgeSec);
  return (
    <>
      tier-state.yml @ {head.sha} <DemoChip on={!!head.demo} what="The tier-state.yml head" />
      <TiersStale stale={stale} /> · polled {age} s ago
    </>
  );
}
