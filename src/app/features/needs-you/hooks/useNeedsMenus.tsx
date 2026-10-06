'use client';

import type { MouseEvent } from 'react';
import { useMenu } from '@/components/overlays/menu/useMenu';
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import { useToast } from '@/components/overlays/toast/useToast';
import { rowDomId } from '@/components/table/model/rowNavigation';
import type { NeedsYouDemo } from '../data/types';
import { groupMenuPlan, rowMenuPlan, type MenuIntent, type MenuPlanItem } from '../model/menu';
import { isDecisionId } from '../model/rows/rowState';
import type { Action, NeedsState } from '../model/types';

/** The right-click menus of the table (rows and group rows), also opened by the ContextMenu key. */
export function useNeedsMenus(s: NeedsState, demo: NeedsYouDemo, dispatch: (a: Action) => void, showInspector: () => void) {
  const menu = useMenu();
  const { status } = useToast();

  const run = (intent: MenuIntent, id: string) => {
    if (intent.kind === 'inspect') {
      dispatch({ type: 'select', id });
      showInspector();
    } else if (intent.kind === 'act') dispatch({ type: 'act', action: intent.action });
    else if (intent.kind === 'collapse') {
      dispatch({ type: 'toggleGroup', id: intent.group, open: false });
      dispatch({ type: 'select', id: `g:${intent.group}` });
    } else if (intent.kind === 'toggle') dispatch({ type: 'toggleGroup', id: intent.group });
    else if (intent.kind === 'expandAll') dispatch({ type: 'expandAll' });
    else {
      const done = () => status('Copied command');
      navigator.clipboard.writeText(intent.text).then(done, () => status(intent.text));
    }
  };
  const entries = (plan: readonly MenuPlanItem[], id: string): MenuEntry[] =>
    plan.map((p) => ('sep' in p ? { sep: true as const } : { label: p.label, sc: p.sc, run: () => run(p.intent, id) }));

  const onRowMenu = (id: string, e: MouseEvent) => {
    dispatch({ type: 'select', id });
    if (isDecisionId(id)) menu.openAt(e.clientX, e.clientY, { items: entries(rowMenuPlan(s, id, demo), id) });
  };
  const onGroupMenu = (id: string, e: MouseEvent) => {
    dispatch({ type: 'select', id: `g:${id}` });
    menu.openAt(e.clientX, e.clientY, { items: entries(groupMenuPlan(s, id), id) });
  };
  /** The ContextMenu key or Shift+F10 on the selected decision: the menu opens under the row. */
  const onMenuKey = (id: string) => {
    if (!isDecisionId(id)) return;
    const r = document.getElementById(rowDomId(id))?.getBoundingClientRect();
    if (r) menu.openAt(r.left + 40, r.bottom, { items: entries(rowMenuPlan(s, id, demo), id), highlightFirst: true });
  };
  return { menu: menu.menu, isOpen: menu.isOpen, onRowMenu, onGroupMenu, onMenuKey };
}
