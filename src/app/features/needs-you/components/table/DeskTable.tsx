'use client';

import { useEffect, type RefObject } from 'react';
import type { NeedsYouDemo } from '../../data/types';
import { useNeedsKeys } from '../../hooks/useNeedsKeys';
import { useNeedsMenus } from '../../hooks/useNeedsMenus';
import { visibleGroups } from '../../model/rows/grouping';
import type { Action, NeedsState } from '../../model/types';
import { DecisionsTable } from './DecisionsTable';

/**
 * The desk's table with its keys and menus: mounted once the desk is read (they act on it). Focus goes to the table when
 * it lands, as it did when the page opened with it.
 */
export function DeskTable({ s, demo, dispatch, tableRef, searchRef, open }: {
  s: NeedsState;
  demo: NeedsYouDemo;
  dispatch: (a: Action) => void;
  tableRef: RefObject<HTMLDivElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  open: (id: string) => void;
}) {
  const groups = visibleGroups(s, demo);
  const menus = useNeedsMenus(s, demo, dispatch, open);
  const onKeyDown = useNeedsKeys({ s, demo, groups, dispatch, tableRef, searchRef, onActivate: open, onMenuKey: menus.onMenuKey });
  useEffect(() => tableRef.current?.focus({ preventScroll: true }), [tableRef]);
  return (
    <>
      <DecisionsTable
        s={s}
        demo={demo}
        groups={groups}
        menuing={menus.isOpen}
        tableRef={tableRef}
        onKeyDown={onKeyDown}
        dispatch={dispatch}
        onActivate={open}
        onRowMenu={menus.onRowMenu}
        onGroupMenu={menus.onGroupMenu}
      />
      {menus.menu}
    </>
  );
}
