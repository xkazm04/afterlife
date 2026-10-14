import Link from 'next/link';
import styles from '@/components/shell/fallback/Fallback.module.css';

/** An unknown /ladder/<class>: says it is the class that is missing (not a page) and links back to the Ladder. */
export default function LadderClassNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Class not found</h1>
        <p className={styles.note}>No action class with that name is on the Ladder. It may have been removed or the link is mistyped.</p>
        <div className={styles.actions}>
          <Link href="/ladder" className={styles.link}>
            Back to the Ladder
          </Link>
        </div>
      </div>
    </main>
  );
}
