import { TrendDelta } from '@/components/viz/trend/TrendDelta';
import { sinceLastWeek, trendOf, trendReady, type TrendFeed } from '@/lib/trend/trend';

/**
 * A group row's week beside its needs sum: the change in what waits in the group since the same day last week. No week
 * to compare: a dash whose hover is the pending line, never 0. The demo's seeded history says so in the hover.
 */
export function GroupTrend({ feed, group }: { feed: TrendFeed; group: string }) {
  const t = trendOf(feed.rows, feed.today, { group });
  const line = trendReady(t) ? `${group} ${sinceLastWeek(t)}` : sinceLastWeek(t);
  return <TrendDelta value={t.delta.needs} label={`waiting in ${group}`} title={feed.seeded ? `${line} (seeded demo history)` : line} />;
}
