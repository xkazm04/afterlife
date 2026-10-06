'use client';

import type { MouseEvent, ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import { groupNavId, rowDomId } from './model/rowNavigation';
import styles from './table.module.css';

/**
 * A group header row: disclosure triangle, name (text, or a node with an accent) and count in the first cell, then your aggregate `children`
 * (cells for the remaining columns, in order). Sticky under the header. `id` is the bare group id; its selection id
 * is "g:<id>" (use groupNavId). Click the triangle or double-click to toggle.
 */
export function GroupRow({
  id,
  label,
  count,
  expanded,
  selected,
  onSelect,
  onToggle,
  onContextMenu,
  children,
}: {
  id: string;
  label: ReactNode;
  count?: number;
  expanded: boolean;
  selected?: boolean;
  onSelect?: (navId: string) => void;
  onToggle?: (id: string) => void;
  onContextMenu?: (id: string, e: MouseEvent) => void;
  children?: ReactNode;
}) {
  const nav = groupNavId(id);
  return (
    <div
      id={rowDomId(nav)}
      className={`${styles.r} ${styles.g}`}
      role="row"
      aria-expanded={expanded}
      aria-level={1}
      aria-selected={!!selected}
      data-part="group-row"
      onMouseDown={(e) => {
        if (e.button === 1) return;
        e.preventDefault();
        onSelect?.(nav);
        e.currentTarget.closest<HTMLElement>('[role="treegrid"]')?.focus({ preventScroll: true });
        const onDisc = (e.target as HTMLElement).closest('[data-disc]') !== null;
        if (e.button === 0 && (onDisc || e.detail === 2)) onToggle?.(id);
      }}
      onContextMenu={(e) => {
        if (!onContextMenu) return;
        e.preventDefault();
        onContextMenu(id, e);
      }}
    >
      <div className={styles.c} role="gridcell">
        <span className={styles.disc} data-disc>
          <Icon name="disc" />
        </span>
        <span className={styles.nm}>{label}</span>
        {count !== undefined ? <span className={styles.gct}>{count}</span> : null}
      </div>
      {children}
      <div className={`${styles.c} ${styles.fill}`} role="gridcell" />
    </div>
  );
}
