import { InspectorSection } from '@/components/inspector/InspectorSection';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { ProofBar } from '@/components/viz/ProofBar';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import styles from './sections.module.css';

/** Pass / fail / inconclusive of the last 7 days, and demotions. Unknown is said so, never drawn as zero. */
export function ProofsSection({ p, sec }: { p: FleetProject; sec: SectionProps }) {
  const pr = p.proofs7d;
  let body;
  if (p.state === 'not-set-up') body = <div className={styles.muted}>No proofs</div>;
  else if (!pr) body = <HonestyChip kind="unknown">Unknown</HonestyChip>;
  else {
    body = (
      <>
        <div className={styles.prf}>
          <div className={styles.ok}>
            <b>{pr.pass}</b>
            <span>pass</span>
          </div>
          <div className={styles.fl}>
            <b>{pr.fail}</b>
            <span>fail</span>
          </div>
          <div className={styles.inc}>
            <b>{pr.inconclusive}</b>
            <span>inconclusive</span>
          </div>
          <div>
            <b>{p.demotions7d == null ? '?' : p.demotions7d}</b>
            <span>demotions</span>
          </div>
        </div>
        <ProofBar proofs={pr} block />
      </>
    );
  }
  return (
    <InspectorSection title="Proofs" aux="7 days" {...sec}>
      {body}
    </InspectorSection>
  );
}
