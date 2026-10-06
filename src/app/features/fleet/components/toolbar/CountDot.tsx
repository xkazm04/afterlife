import styles from './toolbar.module.css';

// kit-candidate: CountDot - a small cyan count badge, for a toolbar button whose filters are on.
export function CountDot({ count }: { count: number }) {
  return <span className={styles.dot}>{count}</span>;
}
