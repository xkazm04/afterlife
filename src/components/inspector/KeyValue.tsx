import type { ReactNode } from 'react';
import styles from './KeyValue.module.css';

/** Label / value rows, value right-aligned. `rows` are [label, value] pairs; a null value is drawn as a dim "unknown". */
export function KeyValue({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className={styles.kv}>
      {rows.map(([k, v]) => (
        <div key={k} className={styles.row}>
          <dt>{k}</dt>
          <dd>{v ?? <span className={styles.unknown}>unknown</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
