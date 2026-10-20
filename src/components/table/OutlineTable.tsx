'use client';

import type { CSSProperties, KeyboardEventHandler, ReactNode, Ref } from 'react';
import styles from './table.module.css';

/**
 * The dense outline table (a treegrid): sticky header, sticky group rows, rows of --row-h, one selection.
 * It fills its positioned parent (the Window's content pane) and scrolls inside it.
 *
 * Columns: pass `columns` as a CSS grid-template-columns value of the DATA columns only (use px()/range() from
 * table/model/columns so tracks grow with the text size). A flexible filler track is appended and every Row,
 * GroupRow and the header add the matching filler cell, so rows always span the pane.
 *
 * Compose: <OutlineTable header={<HeaderCell/>...}> <RowGroup><GroupRow/><Row/>...</RowGroup> </OutlineTable>.
 * Keyboard: pass onKeyDown from useRowNavigation(). The table is focusable; the selected row is the
 * aria-activedescendant. Pass `menuing` while a menu is open so the selection stays bright.
 */
export function OutlineTable({
  label,
  columns,
  minWidth = '0px',
  header,
  children,
  flat,
  menuing,
  activeId,
  onKeyDown,
  tableRef,
  stickyEnd,
}: {
  label: string;
  columns: string;
  minWidth?: string;
  header: ReactNode;
  children: ReactNode;
  /** No groups: rows indent 8px instead of 24px. */
  flat?: boolean;
  menuing?: boolean;
  /** The DOM id of the selected row (rowDomId(id)) for aria-activedescendant. */
  activeId?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  tableRef?: Ref<HTMLDivElement>;
  /** Pin the last data column (a row's actions) to the right edge, so it stays in reach in a narrow pane. */
  stickyEnd?: boolean;
}) {
  const vars = { '--cols': `${columns} minmax(0, 1fr)`, '--minw': minWidth } as CSSProperties;
  return (
    <div
      ref={tableRef}
      className={`${styles.tbl} ${flat ? styles.flat : ''} ${menuing ? styles.menuing : ''} ${stickyEnd ? styles.stickyEnd : ''}`}
      style={vars}
      tabIndex={0}
      role="treegrid"
      aria-label={label}
      aria-activedescendant={activeId}
      onKeyDown={onKeyDown}
    >
      <div className={styles.thead} data-part="thead" role="rowgroup">
        <div className={styles.r} role="row">
          {header}
          <div className={`${styles.c} ${styles.th} ${styles.fill}`} role="columnheader" />
        </div>
      </div>
      <div className={styles.rows} role="rowgroup">
        {children}
      </div>
    </div>
  );
}
