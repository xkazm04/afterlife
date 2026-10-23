import { DetailSection } from '@/components/shell/detail/DetailPage';
import { StageMeter } from '@/components/viz/StageMeter';
import type { FleetProject } from '@/lib/demo/types';
import styles from './sections.module.css';

/** The rung (0..4) on each of the fleet's stages (`stages`); an unknown rung is a dashed "?", never a zero. */
export function StagesSection({ p, stages, }: { p: FleetProject; stages: readonly string[] }) {
  return (
    <DetailSection title="Stages">
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
    </DetailSection>
  );
}
