// The rows on screen: classes grouped by track (a group leads where its first class sorts) and the keyboard walk.
import { groupNavId, isGroupNavId, type NavItem } from '@/components/table/model/rowNavigation';
import type { ClassRow } from '../types';

export interface GroupView {
  /** Track id, "" for the one anonymous group of a flat table. */
  id: string;
  items: ClassRow[];
  open: boolean;
}

export interface RowsView {
  groups: GroupView[];
  /** Selection ids of everything visible, in order: "g:T1" for groups, the class id for rows. */
  flat: string[];
  /** The same, as the table's keyboard model wants it. */
  nav: NavItem[];
}

export function buildRows(visible: readonly ClassRow[], grouped: boolean, collapsed: readonly string[]): RowsView {
  const groups: GroupView[] = [];
  if (grouped) {
    const order: string[] = [];
    for (const c of visible) if (!order.includes(c.track)) order.push(c.track);
    for (const id of order) groups.push({ id, items: visible.filter((c) => c.track === id), open: !collapsed.includes(id) });
  } else {
    groups.push({ id: '', items: [...visible], open: true });
  }
  const flat: string[] = [];
  const nav: NavItem[] = [];
  for (const g of groups) {
    const parent = grouped ? groupNavId(g.id) : undefined;
    if (parent) {
      flat.push(parent);
      nav.push({ id: parent, kind: 'group', expanded: g.open });
    }
    if (!g.open) continue;
    for (const c of g.items) {
      flat.push(c.id);
      nav.push({ id: c.id, kind: 'row', parent });
    }
  }
  return { groups, flat, nav };
}

/** A selection that fell out of view moves to the first class on screen (or the first row). */
export function resolveSelection(sel: string | null, flat: readonly string[]): string | null {
  if (sel && flat.includes(sel)) return sel;
  if (!flat.length) return sel;
  return flat.find((f) => !isGroupNavId(f)) ?? flat[0] ?? null;
}

/**
 * j / k: step over classes only. From a group row, j lands on its first class and k on the class above it.
 * Returns the id to select, or null when there is nothing to select.
 */
export function stepClass(flat: readonly string[], sel: string | null, delta: number): string | null {
  const list = flat.filter((f) => !isGroupNavId(f));
  if (!list.length) return null;
  let i = sel ? list.indexOf(sel) : -1;
  if (i < 0 && sel && isGroupNavId(sel)) {
    const next = flat.slice(flat.indexOf(sel) + 1).find((f) => !isGroupNavId(f));
    i = (next ? list.indexOf(next) : list.length) - (delta > 0 ? 1 : 0);
  }
  const at = Math.max(0, Math.min(list.length - 1, i + delta));
  return list[at] ?? null;
}
