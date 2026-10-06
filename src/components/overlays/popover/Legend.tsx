import type { ReactNode } from 'react';
import styles from './Legend.module.css';

/** A glyph column plus a text column, for legends inside HelpButton / Popover. `rows` are [glyph, text] pairs. */
export function Legend({ rows }: { rows: readonly (readonly [ReactNode, ReactNode])[] }) {
  return (
    <div className={styles.legend}>
      {rows.map(([glyph, text], i) => (
        <div key={i} className={styles.row}>
          <span className={styles.gl}>{glyph}</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}
