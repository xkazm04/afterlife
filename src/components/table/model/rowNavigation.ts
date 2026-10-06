// Pure keyboard navigation over the visible rows of an outline table (the Fleet's treegrid keys).
//   Up / Down / Home / End / PageUp / PageDown  move the selection
//   Left   on a group: collapse; on a row: select its group
//   Right  on a group: expand, or step in when already open
//   Enter  on a group: toggle; on a row: activate (open the inspector)

export interface NavItem {
  /** Stable id. Groups use a "g:" prefix so they can never collide with a row id. */
  id: string;
  kind: 'group' | 'row';
  /** The group's id ("g:...") for a row in a grouped table. */
  parent?: string;
  /** Groups only. */
  expanded?: boolean;
}

export type NavAction =
  | { type: 'select'; id: string }
  | { type: 'toggle'; id: string; open: boolean }
  | { type: 'activate'; id: string }
  | { type: 'none' };

const NONE: NavAction = { type: 'none' };
const STEPS: Record<string, number | undefined> = { ArrowDown: 1, ArrowUp: -1, Home: -1e6, End: 1e6, PageDown: 20, PageUp: -20 };

export const groupNavId = (group: string): string => `g:${group}`;
export const isGroupNavId = (id: string): boolean => id.startsWith('g:');

/** The DOM id of a row element (used by aria-activedescendant and scrolling). Safe characters only. */
export function rowDomId(id: string): string {
  return `row-${id.replace(/^g:/, 'g-').replace(/[^\w-]/g, '_')}`;
}

/** Move by `delta` rows, clamped. With nothing selected, the first row is selected. */
export function moveBy(items: readonly NavItem[], selected: string | null, delta: number): NavAction {
  if (!items.length) return NONE;
  const i = items.findIndex((it) => it.id === selected);
  const next = i < 0 ? 0 : Math.max(0, Math.min(items.length - 1, i + delta));
  const target = items[next];
  return target ? { type: 'select', id: target.id } : NONE;
}

export function navigate(items: readonly NavItem[], selected: string | null, key: string): NavAction {
  const step = STEPS[key];
  if (step !== undefined) return moveBy(items, selected, step);
  const cur = items.find((it) => it.id === selected);
  if (!cur) return NONE;
  if (key === 'ArrowLeft') {
    if (cur.kind === 'group') return cur.expanded ? { type: 'toggle', id: cur.id, open: false } : NONE;
    return cur.parent ? { type: 'select', id: cur.parent } : NONE;
  }
  if (key === 'ArrowRight') {
    if (cur.kind !== 'group') return NONE;
    return cur.expanded ? moveBy(items, selected, 1) : { type: 'toggle', id: cur.id, open: true };
  }
  if (key === 'Enter') return cur.kind === 'group' ? { type: 'toggle', id: cur.id, open: !cur.expanded } : { type: 'activate', id: cur.id };
  return NONE;
}

/** A printable character that should start a search (not a chord, not "/", which has its own shortcut). */
export function isTypeAhead(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  return e.key.length === 1 && e.key !== '/' && !e.ctrlKey && !e.metaKey && !e.altKey && /\S/.test(e.key);
}
