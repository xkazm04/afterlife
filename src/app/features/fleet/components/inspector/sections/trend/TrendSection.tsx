import { DetailSection } from '@/components/shell/detail/DetailPage';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TrendDelta } from '@/components/viz/trend/TrendDelta';
import { TrendStrip } from '@/components/viz/trend/TrendStrip';
import { pendingLine, trendOf, trendReady, TREND_DAYS, type TrendFeed } from '@/lib/trend/trend';
import styles from '../sections.module.css';
import trend from './trend.module.css';

/**
 * The project's last four weeks (fleet_day, one row a UTC day): what waited, whether it was stale, its hands-off classes,
 * each a 28-day strip with its change since last week. Absent: not read. Live with no week to compare yet: the pending
 * line with its n. The demo's history is seeded and says so.
 */
export function TrendSection({ id, feed }: { id: string; feed: TrendFeed | null | undefined }) {
  if (!feed) {
    return (
      <DetailSection title="Trend" aux="4 weeks">
        <p className={styles.muted}>Not read.</p>
      </DetailSection>
    );
  }
  const t = trendOf(feed.rows, feed.today, { project: id });
  const lines = [
    { label: 'waiting', values: t.series.map((p) => p.needs), delta: t.delta.needs },
    { label: 'stale', values: t.series.map((p) => p.stale), delta: t.delta.stale },
    { label: 'hands-off', values: t.series.map((p) => p.handsOff), delta: t.delta.handsOff },
  ];
  return (
    <DetailSection title="Trend" aux={feed.seeded ? <HonestyChip kind="seeded" meaning="Seeded: an illustrative history for the demo, not polled" /> : '4 weeks'}>
      {lines.map((l) => (
        <div key={l.label} className={trend.line}>
          <span className={trend.name}>{l.label}</span>
          <TrendStrip values={l.values} label={l.label} days={TREND_DAYS} />
          <TrendDelta value={l.delta} label={l.label} />
        </div>
      ))}
      {trendReady(t) ? null : <p className={styles.muted}>{pendingLine(t.days)}</p>}
    </DetailSection>
  );
}
