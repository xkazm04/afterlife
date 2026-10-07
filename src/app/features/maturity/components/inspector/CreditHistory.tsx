import Link from 'next/link';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { CreditEntry } from '../../data/types';
import { shortMr } from '../../model/rungs';
import { cx } from '../cx';
import styles from './inspector.module.css';

/** Earlier autopilot cycles on this stage, and the ones credited in this session. Same engine throughout. */
export function CreditHistory({
  rows,
  engine,
  open,
  onOpenChange,
}: {
  rows: readonly CreditEntry[];
  engine: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
          </div>
        ))
      ) : (
        <div className={styles.muted}>No earlier cycles on this stage.</div>
      )}
      <Link href="/cycles" className={styles.toCycles}>
        Every cycle, every stage ›
      </Link>
    </InspectorSection>
  );
}
