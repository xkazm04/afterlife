import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TIER_META } from '@/lib/tiers';
import { NO_ETA_NOTE, THRESHOLD_NOTE } from '../../../data/policy';
import { NO_RULES, type Promotion } from '@/lib/promotion';
import { Chip } from '@/components/status/chip/Chip';
import { DemoChip } from '../../chrome/DemoChip';
import { UncountedChip } from '../../chrome/UncountedChip';
import { Sec, type SectionState } from '../Sec';
import styles from './sections.module.css';

/**
 * The promotion rule as counts, against trust-policy.yml's thresholds. A count is drawn, never a forecast: "no ETA" says
 * so. `uncounted`: the counts read a record the poll did not count (live), marked so. `proofDemo`: the mechanical row's
proof class is the demo catalogue's tracks (live, computed here, not read from the poll's ask). The human key is the promote
 * write's precondition, stated under the rows and never counted among the met ones.
 */
export function PromotionRule({ promotion, uncounted, proofDemo, sections }: { promotion: Promotion; uncounted: boolean; proofDemo: boolean; sections: SectionState }) {
  const counted = promotion.kind === 'eligible' || promotion.kind === 'notyet';
  const aux = counted ? `→ ${TIER_META[promotion.next].name} · ${promotion.rules.filter((r) => r.met).length}/${promotion.rules.length}` : '';
  return (
    <Sec id="rule" title="Promotion rule" aux={aux} anchor="ladder-rule" sections={sections}>
      {counted ? (
        <>
          {promotion.rules.map((r) => (
            <div key={r.name} className={styles.rl}>
              <span>{r.name}</span>
              <span className={styles.v}>
                {r.value}
                {r.name === 'mechanical proof class' ? <DemoChip on={proofDemo} what="The proof class (the demo's tracks)" /> : null}
              </span>
              <span className={r.met ? styles.ok : styles.no} title={r.met ? 'met' : 'not yet'}>
                {r.met ? '✓' : '○'}
              </span>
              {r.cells ? (
                <span className={styles.cells} aria-hidden="true">
                  {Array.from({ length: r.cells[1] }, (_, i) => (
                    <i key={i} className={i < r.cells![0] ? styles.f : undefined} />
                  ))}
                </span>
              ) : null}
            </div>
          ))}
          <div className={styles.note} title="Belay opens the policy MR and stops: it reads no GitLab approval setting">
            Precondition: {promotion.precondition}.
          </div>
          <div className={styles.foot}>
            <span title={THRESHOLD_NOTE}>
              <HonestyChip kind="unknown">policy numbers</HonestyChip>
            </span>
            <Chip compact title={NO_ETA_NOTE}>no ETA</Chip>
            <UncountedChip on={uncounted} />
          </div>
        </>
      ) : (
        <div className={styles.note}>{NO_RULES[promotion.kind as keyof typeof NO_RULES]}</div>
      )}
    </Sec>
  );
}
