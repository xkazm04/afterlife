import Link from 'next/link';
import styles from '@/components/shell/fallback/Fallback.module.css';

/** An unknown /maturity/<stage>: says it is the stage that is missing (not a page) and links back to the crag. */
export default function MaturityStageNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Stage not found</h1>
        <p className={styles.note}>The crag has no stage with that name. The nine stages are the DevSecOps stages the scan reads.</p>
        <div className={styles.actions}>
          <Link href="/maturity" className={styles.link}>
            Back to Maturity
          </Link>
        </div>
      </div>
    </main>
  );
}
