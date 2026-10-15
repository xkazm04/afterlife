import { KeyValue } from '@/components/inspector/KeyValue';
import { Chip } from '@/components/status/chip/Chip';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { enforcementOf } from '../../../model/enforcement/enforcement';
import type { ClassRow } from '../../../model/types';
import { Sec } from '../Sec';
import styles from './sections.module.css';

/**
 * Where the record was enforced: the tier-state.yml commit that wrote it, the gated MR that read it and how long after,
 * and what belay-apply withdrew; an alarm when a gate read it and still granted the old tier. Live: the poll's receipt.
 * Demo: this session's simulated revoke, marked simulated. Nothing when there is nothing to say.
 */
export function EnforcementSection({ cls, live }: { cls: ClassRow; live: boolean }) {
  const e = enforcementOf(cls, live);
  if (!e) return null;
  const aux = e.alarm ? (
    <Chip compact tone="bad" title="A gate read this record's commit and still decided a tier above it: see the tier-gate log of that MR">
      alarm
    </Chip>
  ) : e.simulated ? (
    <HonestyChip kind="simulated" />
  ) : (
    ''
  );
  return (
    <Sec title="Enforced" aux={aux}>
      <KeyValue rows={e.facts.map((f) => [f.label, f.text] as const)} />
      {e.alarm ? <p className={styles.note} role="alert">{e.alarm}</p> : null}
    </Sec>
  );
}
