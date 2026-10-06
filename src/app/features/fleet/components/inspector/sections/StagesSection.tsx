import { InspectorSection } from '@/components/inspector/InspectorSection';
import { StageMeter } from '@/components/viz/StageMeter';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import styles from './sections.module.css';

/** The rung (0..4) on each of the nine stages; an unknown rung is a dashed "?", never a zero. */
export function StagesSection({ p, stages, sec }: { p: FleetProject; stages: readonly string[]; sec: SectionProps }) {
  return (
    <InspectorSection title="Stages" {...sec}>
      {p.state === 'not-set-up' ? (
        <div className={styles.muted}>Not measured</div>
      ) : (
        stages.map((s, i) => {
          const r = p.stages[i] ?? null;
          return (
            <div key={s} className={styles.stg}>
              <span>{s}</span>
              <StageMeter rung={r} />
              <span className={styles.rung}>{r == null ? '?' : `R${r}`}</span>
            </div>
          );
        })
      )}
    </InspectorSection>
  );
}
