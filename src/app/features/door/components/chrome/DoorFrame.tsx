import { Splash } from './Splash';
import styles from './frame.module.css';

/**
 * The door's static frame, prerendered: the night ground, the horizon, the brand plate and the hero mark, painted before
 * the city's data streams in (app/(door)/page.tsx). Still: nothing pulses or scans; the city arrives over it.
 */
export function DoorFrame() {
  return (
    <div className={styles.root}>
      <div className={styles.horizon} />
      <div className={styles.brand}>Afterlife</div>
      <Splash on />
    </div>
  );
}
