import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TIER_META } from '@/lib/tiers';
import { NO_ETA_NOTE, THRESHOLD_NOTE } from '../../../data/policy';
import { NO_RULES, type Promotion } from '@/lib/promotion';
import { Chip } from '@/components/status/chip/Chip';
import { DemoChip } from '../../chrome/DemoChip';
import { Sec, type SectionState } from '../Sec';
import styles from './sections.module.css';

/**
 * The promotion rule as counts, against trust-policy.yml's thresholds. A count is drawn, never a forecast: "no ETA" says
 * so. `demoRecords`: the counts are the demo's records (live mode), marked demo.
 */
export function PromotionRule({ promotion, demoRecords, sections }: { promotion: Promotion; demoRecords: boolean; sections: SectionState }) {
  const counted = promotion.kind === 'eligible' || promotion.kind === 'notyet';
  const aux = counted ? `→ ${TIER_META[promotion.next].name} · ${promotion.rules.filter((r) => r.met).length}/${promotion.rules.length}` : '';
  return (
    <Sec id="rule" title="Promotion rule" aux={aux} anchor="ladder-rule" sections={sections}>
      {counted ? (
        <>
          {promotion.rules.map((r) => (
            <div key={r.name} className={styles.rl}>
              <span>{r.name}</span>
              <span className={styles.v}>{r.value}</span>
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
          <div className={styles.foot}>
            <span title={THRESHOLD_NOTE}>
              <HonestyChip kind="unknown">policy numbers</HonestyChip>
            </span>
            <Chip compact title={NO_ETA_NOTE}>no ETA</Chip>
            <DemoChip on={demoRecords} what="The record these count" />
          </div>
        </>
      ) : (
        <div className={styles.note}>{NO_RULES[promotion.kind as keyof typeof NO_RULES]}</div>
      )}
    </Sec>
  );
}
