import { TierMark } from '@/components/status/TierMark';
import type { FleetProject, TierKey } from '@/lib/demo/types';
import { TIER_META } from '@/lib/tiers';
import { acceptedLabel } from '../../model/inspector';
import type { DeepProject } from '../../model/types';
import styles from './popover.module.css';

/** What the hover card on a tier count says: which classes of this project sit at that tier (and their record). */
export function TierPopover({ p, tier, classes, deep }: { p: FleetProject; tier: TierKey; classes: readonly string[]; deep: DeepProject }) {
  const here = classes.filter((c) => p.classTiers[c] === tier);
  return (
    <>
      <h4>
        {p.name} · {TIER_META[tier].name}
        {p.state === 'stale' ? ' · last known' : ''}
      </h4>
      {here.length ? (
        here.map((c) => (
          <div key={c} className={styles.pl}>
            <TierMark tier={tier} />
            <code>{c}</code>
            <span className={styles.rec}>{p.id === deep.id ? acceptedLabel(deep.actionClasses[c]) : ''}</span>
          </div>
        ))
      ) : (
        <div className={styles.muted}>No classes</div>
      )}
    </>
  );
}
