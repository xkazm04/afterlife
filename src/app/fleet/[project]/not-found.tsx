import Link from 'next/link';
import styles from '@/components/shell/fallback/Fallback.module.css';

/** An unknown /fleet/<project>: says it is the project that is missing and links back to the fleet. */
export default function FleetProjectNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Project not found</h1>
        <p className={styles.note}>No project with that id is in the fleet. It may have been removed or the link is mistyped.</p>
        <div className={styles.actions}>
          <Link href="/fleet" className={styles.link}>
            Back to Fleet
          </Link>
        </div>
      </div>
    </main>
  );
}
