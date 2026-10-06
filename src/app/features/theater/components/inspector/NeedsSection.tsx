import { InspectorSection } from '@/components/inspector/InspectorSection';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import type { NeedItem } from '../../model/types';
import styles from './Inspector.module.css';

/** What waits for a person at this point of the replay. */
export function NeedsSection({ needs }: { needs: readonly NeedItem[] }) {
  return (
    <InspectorSection title="Needs me" aux={<NeedsYouBadge count={needs.length} small />}>
      {needs.map((n) => (
        <div key={n.k} className={styles.nyi}>
          <div className={styles.t}>{n.label}</div>
          <div className={styles.m}>since {n.since}</div>
        </div>
      ))}
    </InspectorSection>
  );
}
