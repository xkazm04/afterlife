import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TrendDelta } from '@/components/viz/trend/TrendDelta';
import { pendingLine, trendOf, trendReady, type TrendFeed } from '@/lib/trend/trend';
import styles from './answer.module.css';

/**
 * Beside the big number: how many more (or fewer) decisions wait than on the same day last week, over the whole fleet.
 * Live with no week to compare yet: the pending line with its n, never +0. The demo's history is seeded and says so.
 */
export function WeekNote({ feed }: { feed: TrendFeed }) {
  const t = trendOf(feed.rows, feed.today);
  return (
    <span className={styles.week}>
      {trendReady(t) ? (
        <>
          <TrendDelta value={t.delta.needs} label="waiting" /> since last week
        </>
      ) : (
        pendingLine(t.days)
      )}
      {feed.seeded ? <HonestyChip kind="seeded" /> : null}
    </span>
  );
}
