import { InspectorSection } from '@/components/inspector/InspectorSection';
import { TierMark } from '@/components/status/TierMark';
import type { FleetProject } from '@/lib/demo/types';
import { TIER_META } from '@/lib/tiers';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import { classTip, recordLabel } from '../../../model/inspector';
import type { DeepProject } from '../../../model/types';
import styles from './sections.module.css';

/** The tier of each action class. The deep project also shows its record (16/15 · 9 d) and the last move as a tooltip. */
export function ClassesSection({ p, classes, deep, sec }: { p: FleetProject; classes: readonly string[]; deep: DeepProject; sec: SectionProps }) {
  const unwatched = p.state === 'not-set-up';
  return (
    <InspectorSection title="Autonomy by class" aux={unwatched ? null : `${p.armed} armed`} {...sec}>
      {unwatched ? (
        <div className={styles.muted}>No classes armed</div>
      ) : (
        classes.map((c) => {
          const t = p.classTiers[c];
          const dc = p.id === deep.id ? deep.actionClasses[c] : undefined;
          return (
            <div key={c} className={`${styles.cl} ${t ? '' : styles.none}`} title={classTip(dc)}>
              <span className={styles.id}>{c}</span>
              <span className={styles.rec}>{recordLabel(dc)}</span>
              {t ? <TierMark tier={t} /> : <span />}
              <span className={styles.tn}>{t ? TIER_META[t].name : 'not armed'}</span>
            </div>
          );
        })
      )}
    </InspectorSection>
  );
}
