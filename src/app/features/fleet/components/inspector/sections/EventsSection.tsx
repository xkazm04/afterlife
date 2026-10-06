import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import type { DeepProject } from '../../../model/types';
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

/** The recent events: the deep project's list, or the one last event the demo has for any other project. */
export function EventsSection({ p, deep, sec }: { p: FleetProject; deep: DeepProject; sec: SectionProps }) {
  const isDeep = p.id === deep.id;
  let body;
  if (isDeep) body = deep.events.map(([at, track, text]) => <Event key={`${at}${track}${text}`} at={at} track={track} text={text} />);
  else if (p.last) body = <Event at={p.last.at} track={p.last.track} text={p.last.text} />;
  else body = <div className={styles.muted}>No events in demo data</div>;
  return (
    <InspectorSection title="Recent events" aux={isDeep ? deep.events.length : null} {...sec}>
      {body}
    </InspectorSection>
  );
}
