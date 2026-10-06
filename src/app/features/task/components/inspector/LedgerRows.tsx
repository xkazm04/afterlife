import type { LedgerRow } from '../../model/types';
import styles from './inspector.module.css';

/** The ledger rows behind the verdict: seq, time, kind, and the first 7 hex digits of the chained hash. Read only. */
export function LedgerRows({ rows, active }: { rows: readonly LedgerRow[]; active: number | null }) {
  return (
    <div role="list" aria-label="Ledger rows">
      {rows.map((r, i) => (
        <div key={r.seq} role="listitem" className={`${styles.lr} ${i === active ? styles.on : ''}`} title={`${r.kind} · ${r.text}`}>
          <span>#{r.seq}</span>
          <span>{r.at}</span>
          <span>{r.kind}</span>
          <span>{r.hash.slice(0, 7)}</span>
        </div>
      ))}
    </div>
  );
}
