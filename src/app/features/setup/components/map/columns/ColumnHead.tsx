import { Chip } from '@/components/status/chip/Chip';
import styles from './columns.module.css';

/** A column's title line: bold name, dim qualifier, a right-hand count. `demo`: what of the column is the demo's (marked). */
export function ColumnHead({ name, sub, aux, demo }: { name: string; sub: string; aux: string; demo?: string }) {
  return (
    <div className={styles.ch}>
      <b>{name}</b> {sub}
      {demo ? (
        <>
          {' '}
          <Chip compact title={demo}>
            demo
          </Chip>
        </>
      ) : null}
      <span className={styles.aux}>{aux}</span>
    </div>
  );
}
