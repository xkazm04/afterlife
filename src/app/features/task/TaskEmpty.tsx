import Link from 'next/link';
import type { ReactNode } from 'react';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import styles from './TaskEmpty.module.css';

/**
 * /task when the data source holds no task to draw (live mode, a quiet group): the Task window says so instead of leaving
 * the app. `children` replaces the words (the docket not read yet, or why it could not be read).
 */
export function TaskEmpty({ children }: { children?: ReactNode }) {
  return (
    <Window title="Task" subtitle="docket">
      <PaneScroll>
        <div className={styles.page}>
          {children ?? (
            <>
              <p>No task is held in the docket yet: the group has opened none for Afterlife to prove.</p>
              <p className={styles.note}>
                The docket fills as the poller reads tasks from the group. <Link href="/fleet">Back to Fleet</Link>
              </p>
            </>
          )}
        </div>
      </PaneScroll>
    </Window>
  );
}
