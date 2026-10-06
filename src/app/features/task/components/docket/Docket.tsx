import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import type { TaskView } from '../../model/types';
import { docketCount } from '../../model/docket/filters';
import styles from './Docket.module.css';

/**
 * The docket: every task as a sidebar link to /task/<id>, a verdict glyph, the title and its track. Filters only hide
 * rows; the open task is marked. Titles truncate: the full one is in the tooltip.
 */
// kit-candidate: SidebarSection with a right-aligned `aux` (here the "2 / 7" count) instead of folding it into the title.
export function Docket({ tasks, visible, currentId }: { tasks: readonly TaskView[]; visible: readonly TaskView[]; currentId: string }) {
  return (
    <SidebarSection title={`Docket · ${docketCount(visible.length, tasks.length)}`}>
      <nav data-docket aria-label="Tasks">
        {visible.length ? (
          visible.map((t) => {
            const fail = t.proof.verdict === 'FAIL';
            return (
              <SidebarItem
                key={t.id}
                href={`/task/${t.id}`}
                current={t.id === currentId}
                icon={<span className={fail ? styles.bad : styles.ok}>{fail ? '✗' : '✓'}</span>}
                label={t.title}
                count={<span className={styles.mono}>{t.track}</span>}
                title={`${t.track} · ${t.mr ?? 'no MR'} · ${t.chain[0]?.at ?? '—'} · ${t.proof.cls}\n${t.title}`}
              />
            );
          })
        ) : (
          <div className={styles.empty}>No match · filters only hide</div>
        )}
      </nav>
    </SidebarSection>
  );
}
