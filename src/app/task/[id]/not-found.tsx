import Link from 'next/link';
import styles from '@/components/shell/fallback/Fallback.module.css';

/** An unknown /task/<id>: says it is the task that is missing (not a page) and links to the docket's first task. */
export default function TaskNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Task not found</h1>
        <p className={styles.note}>No task with that id is held in the docket. It may have been removed or the link is mistyped.</p>
        <div className={styles.actions}>
          <Link href="/task" className={styles.link}>
            Open the docket
          </Link>
        </div>
      </div>
    </main>
  );
}
