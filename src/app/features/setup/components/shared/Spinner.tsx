import styles from './Spinner.module.css';

/** A small ring that turns while a probe runs. Stills under reduced motion. */
export function Spinner() {
  return <span className={styles.spin} aria-hidden="true" />;
}
