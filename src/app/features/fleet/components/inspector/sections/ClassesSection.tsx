import { InspectorSection } from '@/components/inspector/InspectorSection';
import { TierMark } from '@/components/status/TierMark';
import type { FleetProject } from '@/lib/demo/types';
import { cellName, tiersKnown } from '@/lib/tiers';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import { classTip, recordLabel } from '../../../model/inspector';
import type { DeepProject } from '../../../model/types';
import styles from './sections.module.css';

/**
 * The tier of each action class (a split class names each holder at its own tier). The deep project also shows its record
 * (16/15 · 9 d) and the last move as a tooltip. The heading counts the classes whose tier is known, read from the cells
 * (tiersKnown), never from `armed`, which counts armed tracks.
 */
export function ClassesSection({ p, classes, deep, sec }: { p: FleetProject; classes: readonly string[]; deep: DeepProject; sec: SectionProps }) {
  const unwatched = p.state === 'not-set-up';
  const known = !unwatched && tiersKnown(p);
  return (
    <InspectorSection title="Autonomy by class" aux={known ? `${classes.filter((c) => p.classTiers[c] != null).length} of ${classes.length} known` : 'unknown'} {...sec}>
      {unwatched ? (
        <div className={styles.muted}>No classes armed</div>
      ) : !known ? (
        <div className={styles.muted}>Tiers unknown, not zero</div>
      ) : (
        classes.map((c) => {
          const t = p.classTiers[c];
          const holders = p.holders?.[c];
          const dc = p.id === deep.id ? deep.actionClasses[c] : undefined;
          return (
            <div key={c} className={`${styles.cl} ${t ? '' : styles.none}`} title={classTip(dc)}>
              <span className={styles.id}>{c}</span>
              <span className={styles.rec}>{recordLabel(dc)}</span>
              {t ? <TierMark tier={t} holders={holders} /> : <span />}
              <span className={styles.tn}>{cellName(t, holders)}</span>
            </div>
          );
        })
      )}
    </InspectorSection>
  );
}
