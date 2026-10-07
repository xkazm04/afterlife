import styles from './columns.module.css';

/** A column's title line: bold name, dim qualifier, a right-hand count. */
export function ColumnHead({ name, sub, aux }: { name: string; sub: string; aux: string }) {
  return (
    <div className={styles.ch}>
      <b>{name}</b> <span className={styles.sub}>{sub}</span>
      <span className={styles.aux}>{aux}</span>
    </div>
  );
}
