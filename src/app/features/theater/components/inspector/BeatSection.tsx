import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import type { Hold } from '../../model/types';
import styles from './Inspector.module.css';

/** Which of the nine holds the climber is on: hold, stage, and (illustrative film only) who and what the beat is. */
export function BeatSection({ beat, holds }: { beat: number; holds: readonly Hold[] }) {
  const b = beat ? holds[beat - 1] : undefined;
  return (
    <InspectorSection title="Beat" aux={`${beat} / 9`}>
      {b ? (
        <>
          <KeyValue
            rows={[
              ['Hold', b.label],
              ['Stage', b.stage],
              ...(b.who ? [['By', b.who] as const] : []),
            ]}
          />
          {b.text ? <div className={styles.beat}>{b.text}</div> : null}
        </>
      ) : (
        <div className={styles.muted}>On the ground · {holds[0]?.text ? 'before the finding' : 'no hold reached yet'}</div>
      )}
    </InspectorSection>
  );
}
