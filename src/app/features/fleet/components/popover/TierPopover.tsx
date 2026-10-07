import { TierMark } from '@/components/status/TierMark';
import type { FleetProject, TierKey } from '@/lib/demo/types';
import { holdersText, STANDING_META, TIER_META, type Standing } from '@/lib/tiers';
import { acceptedLabel } from '../../model/inspector';
import type { DeepProject } from '../../model/types';
import styles from './popover.module.css';

const STANDINGS: readonly Standing[] = ['no_record', 'refused'];

/**
 * What the hover card on a tier count says: which classes of this project sit at that tier (and their record). The
 * Quarantined card then lists, set apart, the classes that are not a quarantine: no record yet, and split (several agents
 * hold it, each at its own tier).
 */
export function TierPopover({ p, tier, classes, deep }: { p: FleetProject; tier: TierKey; classes: readonly string[]; deep: DeepProject }) {
  const here = classes.filter((c) => p.classTiers[c] === tier);
  const apart = tier === 'quarantined' ? STANDINGS.flatMap((s) => classes.filter((c) => p.classTiers[c] === s).map((c) => [c, s] as const)) : [];
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
      {apart.map(([c, s]) => (
        <div key={c} className={styles.pl}>
          <TierMark tier={s} holders={p.holders?.[c]} />
          <code>{c}</code>
          <span className={styles.rec}>
            {STANDING_META[s].name}
            {s === 'refused' && p.holders?.[c] ? `: ${holdersText(p.holders[c])}` : ''} · not quarantined
          </span>
        </div>
      ))}
    </>
  );
}
