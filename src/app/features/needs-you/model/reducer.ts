// The one reducer of the screen. Pure: the screen turns `notice` and `reveal` into a toast and a scroll.
import { HIST_GROUP, navItems, visibleGroups } from './rows/grouping';
import { act, unstage } from './act';
import { ranPolicy, runItem, wrotePolicy } from './run';
import type { NeedsYouDemo } from '../data/types';
import type { Action, NeedsState } from './types';

const without = <T,>(list: readonly T[], item: T): readonly T[] => list.filter((x) => x !== item);

/** After a filter change the selection must stay on something visible: the first row, else the first group. */
function keepSelection(s: NeedsState, demo: NeedsYouDemo): NeedsState {
  const items = navItems(visibleGroups(s, demo));
  if (!items.length || items.some((i) => i.id === s.sel)) return s;
  const first = items.find((i) => i.kind === 'row') ?? items[0];
  return first ? { ...s, sel: first.id } : s;
}

function setSection(s: NeedsState, key: string, open: boolean): NeedsState {
  const base = { ...s, sections: { ...s.sections, [key]: open } };
  // Opening the draft or the incident note is reading it: the read-before-act gates open.
  if (open && key === 'n2-draft' && !s.read.draft) return { ...base, read: { ...s.read, draft: true } };
  if (open && key === 'n4-note' && !s.read.note) return { ...base, read: { ...s.read, note: true } };
  return s.sections[key] === open ? s : base;
}

export function reduce(s: NeedsState, action: Action, demo: NeedsYouDemo): NeedsState {
  switch (action.type) {
    case 'act':
      return act(s, action.action, demo);
    case 'run':
      return runItem(s, action.key);
    case 'write':
      return wrotePolicy(s, action.key, action.view, demo);
    case 'ran':
      return ranPolicy(s, action.key, action.response, demo);
    case 'remove':
      return unstage(s, action.key, 'Removed. Nothing was sent.');
    case 'select':
      return s.sel === action.id ? s : { ...s, sel: action.id };
    case 'group':
      return { ...s, group: action.mode };
    case 'show':
      return keepSelection({ ...s, show: action.show }, demo);
    case 'query':
      return { ...s, query: action.query };
    case 'toggleGroup': {
      const open = action.open ?? s.collapsed.includes(action.id);
      return { ...s, collapsed: open ? without(s.collapsed, action.id) : [...without(s.collapsed, action.id), action.id] };
    }
    case 'expandAll':
      return { ...s, collapsed: [] };
    case 'section':
      return setSection(s, action.key, action.open);
    case 'itemShut':
      return { ...s, itemsShut: s.itemsShut.includes(action.key) ? without(s.itemsShut, action.key) : [...s.itemsShut, action.key] };
    case 'openHistory':
      return { ...s, show: 'all', collapsed: without(s.collapsed, HIST_GROUP), sel: `g:${HIST_GROUP}` };
  }
}
