import { cx } from '../cx';
import styles from './inspector.module.css';

/** A rung's bolt: filled when earned (green when deep), a dashed ring when it is the next one, an empty ring otherwise. */
export function BoltGlyph({ on, deep, next }: { on: boolean; deep: boolean; next: boolean }) {
  return (
    <svg className={styles.bolt} viewBox="0 0 12 12" aria-hidden="true">
      {on ? (
        <circle className={cx(styles.boltOn, deep && styles.boltDeep)} cx="6" cy="6" r="3.5" />
      ) : next ? (
        <circle className={styles.boltNext} cx="6" cy="6" r="4.5" />
      ) : (
        <circle className={styles.boltOff} cx="6" cy="6" r="3" />
      )}
    </svg>
  );
}
