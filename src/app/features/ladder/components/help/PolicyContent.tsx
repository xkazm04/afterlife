import { HonestyChip } from '@/components/status/HonestyChip';
import { POLICY } from '../../data/policy';
import type { Head } from '../../model/types';
import styles from './help.module.css';

/** The policy rules behind the toolbar lozenge. The thresholds are policy numbers, not measurements. */
export function PolicyContent({ head }: { head: Head }) {
  return (
    <>
      <h4>
        Policy {POLICY.version} · profile {POLICY.profile}
      </h4>
      <dl className={styles.pk}>
        <dt>Merged</dt>
        <dd>{POLICY.mergedAgo}</dd>
        <dt>tier-state.yml</dt>
        <dd>
          <code className={styles.code}>{head.sha}</code> · {head.by}
        </dd>
        <dt>Thresholds</dt>
        <dd>
          <HonestyChip kind="unknown">policy numbers, not measurements</HonestyChip>
        </dd>
        <dt>One step down</dt>
        <dd>{POLICY.oneStepDown}</dd>
        <dt>→ Quarantined</dt>
        <dd>{POLICY.toQuarantined}</dd>
        <dt>Envelope</dt>
        <dd>{POLICY.envelope}</dd>
      </dl>
    </>
  );
}
