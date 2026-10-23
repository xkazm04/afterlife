import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { sinceLastWeek, trendOf, type TrendFeed } from '@/lib/trend/trend';

/**
 * The status bar's week: " · since last week: +2 waiting · +1 stale" over the whole fleet, or, live with no week to
 * compare yet, " · trend starts after 7 days of polling (n so far)". The demo's history is seeded and says so.
 */
export function TrendNote({ feed }: { feed: TrendFeed }) {
  const t = trendOf(feed.rows, feed.today);
  return (
    <>
      {` · ${sinceLastWeek(t)}`}
      {feed.seeded ? (
        <>
          {' '}
          <HonestyChip kind="seeded" />
        </>
      ) : null}
    </>
  );
}
