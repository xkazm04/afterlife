import styles from './toolbar.module.css';

/** A small cyan count on a toolbar button whose filters are on. */
export function CountDot({ count }: { count: number }) {
  return <span className={styles.dot}>{count}</span>;
}
