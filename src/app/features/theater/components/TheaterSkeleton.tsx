import { Window } from '@/components/shell/Window';
import styles from './TheaterSkeleton.module.css';

/**
 * The Theater window while the server picks and reads the film (the ledger, or the runner's files for the live film):
 * the real title, a stage and a transport line. Nothing plays and nothing is polled until the film arrives.
 */
export function TheaterSkeleton() {
  return (
    <Window title="Theater" subtitle="loading" status="Loading…">
      <div className={styles.pane} role="status" aria-busy="true" aria-label="Loading Theater">
        <span className={`${styles.bar} ${styles.stage}`} />
        <span className={styles.bar} style={{ width: '64%' }} />
        <span className={`${styles.bar} ${styles.transport}`} />
      </div>
    </Window>
  );
}
