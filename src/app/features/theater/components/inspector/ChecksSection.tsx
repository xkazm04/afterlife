import { InspectorSection } from '@/components/inspector/InspectorSection';
import { CHECKS } from '../../data/constants';
import type { CheckId } from '../../model/types';
import styles from './Inspector.module.css';

/** The five proof checks of !41. Not yet run is drawn dashed with a dash, never as a fail. */
export function ChecksSection({ done }: { done: readonly CheckId[] }) {
  return (
    <InspectorSection title="Proof checks · !41" aux={`${done.length} / ${CHECKS.length}`}>
      {CHECKS.map((c) => {
        const ok = done.includes(c);
        return (
          <div key={c} className={`${styles.ck} ${ok ? styles.pass : ''}`}>
            <i className={styles.g} />
            <span className={styles.nm}>{c}</span>
            <span className={styles.rs}>{ok ? 'PASS' : '—'}</span>
          </div>
        );
      })}
    </InspectorSection>
  );
}
