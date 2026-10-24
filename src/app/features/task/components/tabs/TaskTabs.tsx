'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { stepTab, TASK_TABS, type TaskTab } from '../../model/tab';
import styles from './tabs.module.css';

/**
 * The three views under the verdict, one at a time: a tab list (← → Home End move and open, roving tabIndex), then the
 * open tab's panel. Only the open panel is mounted: the Court measures its ties when it mounts, and a card a key selects is
 * never focused inside a hidden panel. `aux` is a dim note after a tab's name (the ledger's row count).
 */
export function TaskTabs({ tab, onTab, aux, children }: { tab: TaskTab; onTab: (t: TaskTab) => void; aux?: Partial<Record<TaskTab, ReactNode>>; children: ReactNode }) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const to = stepTab(tab, e.key);
    if (to === null) return;
    e.preventDefault(); // the screen's own keys (the court's arrows) leave a handled key alone
    onTab(to);
    list.current?.querySelector<HTMLElement>(`[data-tab="${to}"]`)?.focus();
  };
  return (
    <div className={styles.views}>
      <div ref={list} className={styles.tabs} role="tablist" aria-label="Task views" onKeyDown={onKey}>
        {TASK_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            data-tab={t.key}
            id={`${id}-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`${id}-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className={styles.tab}
            onClick={() => onTab(t.key)}
          >
            {t.label}
            {aux?.[t.key] != null ? <span className={styles.ct}>{aux[t.key]}</span> : null}
          </button>
        ))}
      </div>
      {TASK_TABS.map((t) => (
        <div key={t.key} role="tabpanel" id={`${id}-panel-${t.key}`} aria-labelledby={`${id}-tab-${t.key}`} hidden={tab !== t.key} className={styles.panel}>
          {tab === t.key ? children : null}
        </div>
      ))}
    </div>
  );
}
