import styles from './cells.module.css';

/**
 * The dot beside a project's name when it moved since the viewer's last look; the title says what moved and since when.
 * Without a title it is the same dot as an icon (the sidebar's Changed source, the legend), hidden from screen readers.
 */
export function ChangeMark({ title }: { title?: string }) {
  if (!title) return <span className={`${styles.chg} ${styles.chgIcon}`} aria-hidden />;
  return <span className={styles.chg} role="img" aria-label={title} title={title} />;
}
