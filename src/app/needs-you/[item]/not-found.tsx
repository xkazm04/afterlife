import Link from 'next/link';
import styles from '@/components/shell/fallback/Fallback.module.css';

/** An unknown /needs-you/<item>: says it is the decision that is missing and links back to the desk. */
export default function NeedsItemNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Decision not found</h1>
        <p className={styles.note}>No decision with that id waits on your desk. It may have been decided, or the link is mistyped.</p>
        <div className={styles.actions}>
          <Link href="/needs-you" className={styles.link}>
            Back to Needs you
          </Link>
        </div>
      </div>
    </main>
  );
}
