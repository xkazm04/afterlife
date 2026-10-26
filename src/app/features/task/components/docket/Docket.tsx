import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { Unread } from '@/components/shell/host';
import { docketCount } from '../../model/docket/filters';
import type { DocketRow } from '../../model/docket/row';
import { verdictGlyph, verdictKind } from '../../model/verdict/verdict';
import { taskHref } from './taskHref';
import styles from './Docket.module.css';

/**
 * The docket: every task as a sidebar link to /task/<id>, a verdict glyph, the title and its track. Filters only hide
 * rows; the open task is marked. Titles truncate: the full one is in the tooltip.
 */
export function Docket({ tasks, visible, currentId, onClear }: { tasks: readonly DocketRow[]; visible: readonly DocketRow[]; currentId: string; onClear: () => void }) {
  return (
    <SidebarSection title="Docket" aux={docketCount(visible.length, tasks.length)}>
      <nav data-docket aria-label="Tasks">
        {visible.length ? (
          visible.map((t) => {
            const kind = verdictKind(t.verdict);
            return (
              <SidebarItem
                key={t.id}
                href={taskHref(t.id)}
                current={t.id === currentId}
                icon={<span className={kind === 'bad' ? styles.bad : kind === 'ok' ? styles.ok : undefined}>{verdictGlyph(t.verdict)}</span>}
                label={t.title}
                count={<span className={styles.mono}>{t.track}</span>}
                title={`${t.mismatch ? `stored ${t.stored} - checks say ${t.verdict}
` : ''}${t.track} · ${t.mr ?? 'no MR'} · ${t.firstAt ?? '—'} · ${t.cls}\n${t.title}`}
              />
            );
          })
        ) : (
          <div className={styles.empty}>
            No tasks match these filters.{' '}
            <button type="button" className={styles.clear} onClick={onClear}>
              Clear filters
            </button>
          </div>
        )}
      </nav>
    </SidebarSection>
  );
}

/** The docket before it is read (the screen stream's docket slice): its section, a dash for the count, no rows yet. */
export function DocketPending() {
  return (
    <SidebarSection title="Docket" aux={<Unread label="tasks not read yet" />}>
      <nav data-docket aria-label="Tasks" aria-busy="true" />
    </SidebarSection>
  );
}
