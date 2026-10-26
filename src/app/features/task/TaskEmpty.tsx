import Link from 'next/link';
import styles from './TaskEmpty.module.css';

/** /task when the data source holds no task to draw (live mode, a quiet group): says so in the window instead of leaving the app. */
export function TaskEmpty() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Task</h1>
      <p>No task is held in the docket yet: the group has opened none for Afterlife to prove.</p>
      <p className={styles.note}>
        The docket fills as the poller reads tasks from the group. <Link href="/fleet">Back to Fleet</Link>
      </p>
    </main>
  );
}
