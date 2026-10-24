import type { LedgerRow } from '../../model/types';
import styles from './tabs.module.css';

/**
 * The ledger rows behind the verdict, one line each at full width: seq, time, kind, the row's text, and its link in the
 * chain (the previous hash and its own, first 7 hex digits; the whole hash on hover). Read only; `active` is the row a
 * running replay has lit.
 */
export function LedgerRows({ rows, active }: { rows: readonly LedgerRow[]; active: number | null }) {
  return (
    <table className={styles.rows} aria-label="Ledger rows">
      <thead>
        <tr>
          <th scope="col">Seq</th>
          <th scope="col">At</th>
          <th scope="col">Kind</th>
          <th scope="col">Row</th>
          <th scope="col">Chain</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.seq} className={i === active ? styles.on : undefined} aria-current={i === active ? 'step' : undefined}>
            <td>#{r.seq}</td>
            <td>{r.at}</td>
            <td>{r.kind}</td>
            <td className={styles.text} title={r.text}>
              {r.text}
            </td>
            <td className={styles.hash} title={`prev ${r.prev}\nhash ${r.hash}`}>
              {r.prev ? r.prev.slice(0, 7) : 'genesis'} → {r.hash.slice(0, 7)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
