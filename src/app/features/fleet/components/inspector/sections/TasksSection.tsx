import Link from 'next/link';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import { verdictMark } from '../../../model/inspector';
import type { DeepProject } from '../../../model/types';
import styles from './sections.module.css';

const TONE = { ok: styles.vok, bad: styles.vbad, unk: styles.vunk, none: styles.vnone } as const;

/**
 * The tasks the data source holds for the deep project, each with its stored verdict, linking to its Task page. Tasks are
 * read for the deep project only, and any other project says so.
 */
export function TasksSection({ p, deep, sec }: { p: FleetProject; deep: DeepProject; sec: SectionProps }) {
  const isDeep = p.id === deep.id;
  let body;
  if (!isDeep) body = <div className={styles.muted}>Listed for {deep.id} only</div>;
  else if (!deep.tasks.length) body = <div className={styles.muted}>No tasks</div>;
  else {
    body = deep.tasks.map((t) => {
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
    <InspectorSection title="Tasks" aux={isDeep ? deep.tasks.length : null} {...sec}>
      {body}
    </InspectorSection>
  );
}
