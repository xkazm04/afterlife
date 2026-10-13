import type { ReactNode } from 'react';
import styles from './inspector.module.css';

/** What sits under a detail page's title: the sub line (state, move, source) and the mono path of the write. */
export function ItemHead({ sub, path }: { sub?: ReactNode; path?: ReactNode }) {
  return (
    <div className={styles.head}>
      {sub ? <div>{sub}</div> : null}
      {path ? <div className={styles.path}>{path}</div> : null}
    </div>
  );
}
