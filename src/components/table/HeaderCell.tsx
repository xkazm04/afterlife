import type { ReactNode } from 'react';
import type { Ceiling } from '@/schemas';
import { Icon } from '@/components/icons/Icon';
import { ariaSort, type SortState } from './model/sort';
import styles from './table.module.css';

/**
 * A column header. With `sortKey` + `onSort` it is a button that shows the sort arrow when it is the active column.
 * `tier` + `ranked` tint the header of the tier column the table is ranked by. `tip` is the tooltip (and the name of
 * an icon-only header). `iconOnly` says the header shows no text and is named by `tip`; left out, only a header with no
 * string child is taken for icon-only (a header whose text sits in a wrapper must say `iconOnly={false}`).
 */
export function HeaderCell<K extends string>({
  sortKey,
  sort,
  onSort,
  align = 'start',
  tip,
  iconOnly: iconOnlyProp,
  tier,
  ranked,
  children,
}: {
  sortKey?: K;
  sort?: SortState<K>;
  onSort?: (key: K) => void;
  align?: 'start' | 'center' | 'end';
  tip?: string;
  iconOnly?: boolean;
  tier?: Ceiling;
  ranked?: boolean;
  children?: ReactNode;
}) {
  const cls = [styles.c, styles.th, align === 'center' ? styles.ctr : align === 'end' ? styles.rt : '', ranked ? styles.ranked : '']
    .filter(Boolean)
    .join(' ');
  const iconOnly = iconOnlyProp ?? typeof children !== 'string';
  const active = sortKey !== undefined && sort?.key === sortKey;
  const inner = (
    <>
      {typeof children === 'string' ? <span className={styles.lab}>{children}</span> : children}
      {active && sort ? <Icon name={sort.dir > 0 ? 'sortUp' : 'sortDown'} className={styles.srt} /> : null}
    </>
  );
  if (sortKey === undefined || !onSort) {
    return (
      <div className={cls} role="columnheader" title={tip} aria-label={iconOnly ? tip : undefined} data-tier={tier}>
        {inner}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      role="columnheader"
      aria-sort={sort ? ariaSort(sort, sortKey) : 'none'}
      title={tip}
      aria-label={iconOnly ? tip : undefined}
      data-tier={tier}
      tabIndex={-1}
      onMouseDown={(e) => {
        // A button takes focus on mouse-down; the treegrid's keys only work while the table itself has it.
        if (e.button === 1) return;
        e.preventDefault();
        e.currentTarget.closest<HTMLElement>('[role="treegrid"]')?.focus({ preventScroll: true });
      }}
      onClick={() => onSort(sortKey)}
    >
      {inner}
    </button>
  );
}
