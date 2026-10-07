import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import type { DeepProject, FleetSource } from '../../../model/types';
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
export function EventsSection({ p, deep, source, sec }: { p: FleetProject; deep: DeepProject; source: FleetSource; sec: SectionProps }) {
  const isDeep = p.id === deep.id;
  const none = source.mode === 'live' ? 'No events indexed' : 'No events in demo data';
  let body;
  if (isDeep && source.events.length) body = source.events.map(([at, track, text], i) => <Event key={`${i}${at}${track}`} at={at} track={track} text={text} />);
  else if (!isDeep && p.last) body = <Event at={p.last.at} track={p.last.track} text={p.last.text} />;
  else body = <div className={styles.muted}>{none}</div>;
  return (
    <InspectorSection title="Recent events" aux={isDeep ? source.events.length : null} {...sec}>
      {body}
    </InspectorSection>
  );
}
