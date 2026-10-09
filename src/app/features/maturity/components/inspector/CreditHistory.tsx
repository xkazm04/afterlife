import { InspectorSection } from '@/components/inspector/InspectorSection';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { CreditEntry } from '../../data/types';
import { shortMr } from '../../model/rungs';
import { cx } from '../cx';
import styles from './inspector.module.css';

/**
 * Earlier autopilot cycles on this stage (the demo's: live mode has none, Belay records no credit history yet), and the ones
 * this session's simulated rescan credited, marked simulated.
 */
export function CreditHistory({
  past,
  session,
  live,
  engine,
  open,
  onOpenChange,
}: {
  past: readonly CreditEntry[];
  session: readonly CreditEntry[];
  live: boolean;
  engine: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rows = [...past, ...session];
  return (
    <InspectorSection title="Credit history" aux={rows.length ? `${rows.length} · engine ${engine}` : '0'} open={open} onOpenChange={onOpenChange}>
      {rows.length ? (
        rows.map((c, i) => (
          <div key={`${c.mr}-${c.move}-${i}`} className={styles.hr} title={c.why}>
            <span className={styles.mono}>{shortMr(c.mr)}</span>
            <span className={styles.mono}>{c.move.replace(' → ', '→')}</span>
            <span className={cx(c.verdict === 'rejected' ? styles.rej : styles.cre)}>
              {c.verdict}
              <span className={styles.why}> · {c.why}</span>
            </span>
            {i >= past.length ? <HonestyChip kind="simulated" /> : null}
          </div>
        ))
      ) : (
        <div className={styles.muted}>{live ? 'No credit recorded: Belay keeps no credit history for this project yet.' : 'No earlier cycles on this stage.'}</div>
      )}
    </InspectorSection>
  );
}
