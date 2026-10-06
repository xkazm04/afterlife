import styles from './loading.module.css';

/** The door's frame before the city arrives: the night ground, the horizon, the brand plate and a quiet scan. */
export function DoorLoading() {
  return (
    <div className={styles.root} aria-busy="true" aria-label="Loading the front door">
      <div className={styles.horizon} />
      <div className={styles.brand}>Afterlife</div>
      <div className={styles.scan} />
    </div>
  );
}
