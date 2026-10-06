import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import type { DeepProject } from '../../../model/types';
import styles from './sections.module.css';

/** The eight tracks of the deep project and what each one waits for. Closed until opened. */
export function TracksSection({ deep, sec }: { deep: DeepProject; sec: SectionProps }) {
  return (
    <InspectorSection title="Tracks" aux={deep.running} {...sec}>
      {deep.tracks.map((t) => (
        <div key={t.id} className={styles.ev}>
          <span className={styles.tk}>{t.id}</span>
          <span className={`${styles.tx} ${styles.wide}`}>
            {t.name}
            {t.needs ? (
              <>
                {' · '}
                <span className={styles.needs}>{t.needs}</span>
              </>
            ) : null}
          </span>
        </div>
      ))}
    </InspectorSection>
  );
}
