import type { CSSProperties } from 'react';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { WHO } from '../../data/constants';
import type { LedgerEntry } from '../../model/types';
import styles from './Cap.module.css';

/** The caption: who, seq and clock, what happened, and (for the !44 finding) the untrusted quote, drawn as text. */
export function Cap({ e, y, cut, quote }: { e: LedgerEntry; y: number; cut: boolean; quote: string }) {
  return (
    <div className={`${styles.cap} ${cut ? styles.cut : ''}`} style={{ '--y': `${y}%` } as CSSProperties}>
      <div className={styles.who}>
        <span>{WHO[e.by]}</span>
        {e.seeded ? <HonestyChip kind="seeded" /> : null}
        <span className={styles.sq}>
          seq {e.seq} · {e.t}
        </span>
      </div>
      <div key={e.seq} className={styles.x}>
        {e.x}
      </div>
      {e.quote ? (
        <>
          <div className={styles.qh}>quoted from !44 · untrusted</div>
          <div className={styles.quote}>
            <UntrustedText source="upstream changelog quoted on !44">{quote}</UntrustedText>
          </div>
        </>
      ) : null}
    </div>
  );
}
