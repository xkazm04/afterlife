import Link from 'next/link';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { Chip } from '@/components/status/chip/Chip';
import { DemoChip } from '../../chrome/DemoChip';
import type { LedgerEntry } from '../../../model/types';
import styles from './log.module.css';

/** The MR a replay link films first (`/theater?mr=44` -> "!44"), for the link's text; null if it names none. */
const replayMr = (href: string): string | null => {
  const iid = /[?&]mr=(\d+)/.exec(href)?.[1];
  return iid ? `!${iid}` : null;
};

/**
 * One ledger entry: time, who (with the actor's colour), what, the guardrail's untrusted quote if any, and (live) a
 * "Replay !N" link to the Theater filming that MR.
 */
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
          {entry.demo ? (
            <span className={styles.chip}>
              <DemoChip what="The demo's own ledger" />
            </span>
          ) : null}
        </div>
        <div className={styles.x}>{entry.text}</div>
        {entry.replay ? (
          <Link className={styles.replay} href={entry.replay}>
            {['Replay', replayMr(entry.replay)].filter(Boolean).join(' ')}
          </Link>
        ) : null}
        {entry.quote ? (
          <div className={styles.quote}>
            <UntrustedText source="quoted by the guardrail">{entry.quote}</UntrustedText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
