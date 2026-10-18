import { DetailSection } from '@/components/shell/detail/DetailPage';
import type { EventsSlice } from '../../../model/project/view';
import styles from './sections.module.css';

function Event({ at, track, text }: { at: string; track: string; text: string }) {
  return (
    <div className={styles.ev}>
      <span className={styles.tm}>{at}</span>
      <span className={styles.tk}>{track}</span>
      <span className={styles.tx}>{text}</span>
    </div>
  );
}

/**
 * The recent events: the deep project's list (the demo's feed, or in live mode read from the index), or the one last
 * event the fleet row has for any other project.
 */
export function EventsSection({ events, live }: { events: EventsSlice; live: boolean }) {
  const rows = events.kind === 'list' ? events.rows : events.row ? [events.row] : [];
  const body = rows.length ? (
    rows.map(([at, track, text], i) => <Event key={`${i}${at}${track}`} at={at} track={track} text={text} />)
  ) : (
    <div className={styles.muted}>{live ? 'No events indexed' : 'No events in demo data'}</div>
  );
  return (
    <DetailSection title="Recent events" aux={events.kind === 'list' ? events.rows.length : null}>
      {body}
    </DetailSection>
  );
}
