import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import type { TheaterDemo } from '../../model/types';
import styles from './Inspector.module.css';

/** Which of the nine holds the climber is on: hold, stage, who, and what the beat is. */
export function BeatSection({ beat, demo }: { beat: number; demo: TheaterDemo }) {
  const b = beat ? demo.loop[beat - 1] : undefined;
  return (
    <InspectorSection title="Beat" aux={`${beat} / 9`}>
      {b ? (
        <>
          <KeyValue
            rows={[
              ['Hold', b.label],
              ['Stage', b.stage],
              ['By', b.who],
            ]}
          />
          <div className={styles.beat}>{b.text}</div>
        </>
      ) : (
        <div className={styles.muted}>On the ground · before the finding</div>
      )}
    </InspectorSection>
  );
}
