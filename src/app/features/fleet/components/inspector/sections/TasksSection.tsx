import Link from 'next/link';
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { verdictMark } from '../../../model/inspector';
import type { TasksSlice } from '../../../model/project/view';
import styles from './sections.module.css';

const TONE = { ok: styles.vok, bad: styles.vbad, unk: styles.vunk, none: styles.vnone } as const;

/**
 * The tasks the data source holds for the deep project, each with its stored verdict, linking to its Task page. Tasks are
 * read for the deep project only, and any other project says so.
 */
export function TasksSection({ tasks }: { tasks: TasksSlice }) {
  let body;
  if (tasks.kind === 'elsewhere') body = <div className={styles.muted}>Tasks are listed for {tasks.deepId} only</div>;
  else if (!tasks.tasks.length) body = <div className={styles.muted}>No tasks</div>;
  else {
    body = tasks.tasks.map((t) => {
      const m = verdictMark(t.verdict);
      return (
        <Link key={t.id} href={`/task/${encodeURIComponent(t.id)}`} className={styles.task} title={`${t.id} · ${m.word} · ${t.state}\n${t.title}`}>
          <span className={`${styles.vg} ${TONE[m.tone]}`} aria-hidden="true">
            {m.glyph}
          </span>
          <span className={styles.tt}>
            {t.mr ? `${t.mr} ` : ''}
            {t.title}
          </span>
          <span className={styles.m}>
            {m.word} · {t.track} · {t.state}
          </span>
        </Link>
      );
    });
  }
  return (
    <DetailSection title="Tasks" aux={tasks.kind === 'list' ? tasks.tasks.length : null}>
      {body}
    </DetailSection>
  );
}
