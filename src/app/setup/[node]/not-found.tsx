import Link from 'next/link';
import styles from '@/components/shell/fallback/Fallback.module.css';

/** An unknown /setup/<node>: says it is the step, track or capability that is missing and links back to the map. */
export default function SetupNodeNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Setup node not found</h1>
        <p className={styles.note}>The unlock map holds no step, track or capability by that name. The link may be mistyped.</p>
        <div className={styles.actions}>
          <Link href="/setup" className={styles.link}>
            Open the unlock map
          </Link>
        </div>
      </div>
    </main>
  );
}
