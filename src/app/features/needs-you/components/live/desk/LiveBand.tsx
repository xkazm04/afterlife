import { plural } from '@/lib/format/plural';
import type { DeskSummary } from '../../../model/desk';
import { shortAge } from '../../../model/clock/age';
import styles from './desk.module.css';

/** "3 decisions · 2 projects · oldest 2d": the oldest part is left out when no open row has a known start, never "0d". */
export function bandLine(s: DeskSummary, now: Date): string {
  const oldest = shortAge(s.oldestOpenedAt, now);
  return [plural(s.count, 'decision'), plural(s.projects, 'project'), ...(oldest ? [`oldest ${oldest}`] : [])].join(' · ');
}

/** The live desk's summary band: how much waits, across how many projects, since when; and where it was read from. */
export function LiveBand({ summary, now, seeded }: { summary: DeskSummary; now: Date; seeded: number }) {
  return (
    <section className={styles.band} aria-label="What waits for you">
      <span className={styles.sum}>{bandLine(summary, now)}</span>
      <span className={styles.note}>
        read from your GitLab group by the last poll
        {seeded ? ` · ${plural(seeded, 'demo item')} seeded into this index, not shown: not your group's` : ''}
      </span>
    </section>
  );
}
