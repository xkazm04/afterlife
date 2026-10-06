import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { Chip } from '@/components/status/chip/Chip';
import type { LedgerEntry } from '../../../model/types';
import styles from './log.module.css';

/** One ledger entry: time, who (with the actor's colour), what, and the guardrail's untrusted quote if any. */
export function LogItem({ entry, dim }: { entry: LedgerEntry; dim?: boolean }) {
  return (
    <div className={`${styles.lg} ${styles[`k-${entry.kind}`]} ${dim ? styles.dim : ''} ${entry.isNew ? styles.new : ''}`}>
      <span className={styles.t}>{entry.t}</span>
      <div>
        <div className={styles.who}>
          <b>{entry.actor}</b>· {entry.where}
          {entry.lag ? (
            <span className={styles.chip}>
              <Chip compact tone="lag" title="Belay polls; it was not in the loop">
                {entry.lag}
              </Chip>
            </span>
          ) : null}
          {entry.chip ? (
            <span className={styles.chip}>
              <HonestyChip kind={entry.chip} />
            </span>
          ) : null}
        </div>
        <div className={styles.x}>{entry.text}</div>
        {entry.quote ? (
          <div className={styles.quote}>
            <UntrustedText source="quoted by the guardrail">{entry.quote}</UntrustedText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
