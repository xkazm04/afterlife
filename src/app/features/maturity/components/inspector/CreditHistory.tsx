import Link from 'next/link';
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { CreditEntry } from '../../data/types';
import { cx } from '../cx';
import styles from './inspector.module.css';

/**
 * Earlier autopilot cycles on this stage (the demo's: live mode has none, Afterlife records no credit history yet), and the ones
 * this session's simulated rescan credited, marked simulated.
 */
export function CreditHistory({
  past,
  session,
  live,
  engine,
}: {
  past: readonly CreditEntry[];
  session: readonly CreditEntry[];
  live: boolean;
  engine: string;
}) {
  const rows = [...past, ...session];
  return (
    <DetailSection title="Credit history" aux={rows.length ? `${rows.length} · engine ${engine}` : '0'}>
      {rows.length ? (
        rows.map((c, i) => (
          <div key={`${c.mr}-${c.move}-${i}`} className={styles.hr} title={c.why}>
            <span className={styles.mono}>{c.mr}</span>
            <span className={styles.mono}>{c.move.replace(' → ', '→')}</span>
            <span className={cx(c.verdict === 'rejected' ? styles.rej : styles.cre)}>
              {c.verdict}
              <span className={styles.why}> · {c.why}</span>
            </span>
            {i >= past.length ? <HonestyChip kind="simulated" /> : null}
          </div>
        ))
      ) : (
        <div className={styles.muted}>{live ? 'No credit recorded: Afterlife keeps no credit history for this project yet.' : 'No earlier cycles on this stage.'}</div>
      )}
      <Link href="/cycles" className={styles.toCycles}>
        Every cycle, every stage ›
      </Link>
    </DetailSection>
  );
}
