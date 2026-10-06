'use client';

import type { MouseEvent, ReactNode } from 'react';
import { rowDomId } from './model/rowNavigation';
import styles from './table.module.css';

/**
 * A data row of --row-h. `id` is your row id. Mouse-down selects (and keeps focus on the table); double-click
 * activates; right-click calls onContextMenu. Rules of the honesty marks: `stale` hatches and dims the row's glyphs
 * (data-stale reaches TierMark, ProofBar, StageTicks), `muted` greys the name of an unwatched row.
 * Children are the cells in column order (start with <Cell indent>); the filler cell is added for you.
 */
export function Row({
  id,
  selected,
  alt,
  stale,
  muted,
  level = 2,
  onSelect,
  onActivate,
  onContextMenu,
  children,
}: {
  id: string;
  selected?: boolean;
  /** Zebra stripe; alternate with the row index. */
  alt?: boolean;
  stale?: boolean;
  muted?: boolean;
  /** aria-level: 2 under a group, 1 in a flat table. */
  level?: 1 | 2;
  onSelect?: (id: string) => void;
  onActivate?: (id: string) => void;
  onContextMenu?: (id: string, e: MouseEvent) => void;
  children: ReactNode;
}) {
  const cls = [styles.r, styles.row, alt ? styles.alt : '', muted ? styles.nsu : ''].filter(Boolean).join(' ');
  return (
    <div
      id={rowDomId(id)}
      className={cls}
      role="row"
      aria-selected={!!selected}
      aria-level={level}
      data-stale={stale ? 'true' : undefined}
      onMouseDown={(e) => {
        if (e.button === 1) return;
        e.preventDefault();
        onSelect?.(id);
        e.currentTarget.closest<HTMLElement>('[role="treegrid"]')?.focus({ preventScroll: true });
        if (e.button === 0 && e.detail === 2) onActivate?.(id);
      }}
      onContextMenu={(e) => {
        if (!onContextMenu) return;
        e.preventDefault();
        onContextMenu(id, e);
      }}
    >
      {children}
      <div className={`${styles.c} ${styles.fill}`} role="gridcell" />
    </div>
  );
}
