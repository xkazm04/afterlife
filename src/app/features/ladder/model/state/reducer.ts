import { toggleSort, computeOrder } from '../view/sort';
import { nextSha, commitRevoke, settleCommit } from './commit';
import { initialState } from './initial';
import type { LadderAction, LadderState } from './state';

const without = (list: readonly string[], id: string): string[] => list.filter((x) => x !== id);

/** Re-freeze the order after the sort changed. */
const resorted = (s: LadderState, sort: LadderState['sort']): LadderState => ({ ...s, sort, order: computeOrder(s.classes, s.ledger, sort) });

export function ladderReducer(s: LadderState, a: LadderAction): LadderState {
  switch (a.type) {
    case 'select':
      return s.sel === a.id ? s : { ...s, sel: a.id };
    case 'sort':
      return resorted(s, toggleSort(s.sort, a.key));
    case 'sortSet':
      return resorted(s, a.sort);
    case 'grouped':
      return { ...s, grouped: a.value };
    case 'toggleGroup': {
      const isOpen = !s.collapsed.includes(a.id);
      const open = a.open ?? !isOpen;
      if (open === isOpen) return s;
      return { ...s, collapsed: open ? without(s.collapsed, a.id) : [...s.collapsed, a.id] };
    }
    case 'collapseAll':
      return { ...s, collapsed: [...a.ids] };
    case 'expandAll':
      return { ...s, collapsed: [] };
    case 'filter':
      return { ...s, filt: a.tier };
    case 'source':
      return { ...s, src: a.src };
    case 'query':
      return { ...s, q: a.q };
    case 'revoke': {
      if (!s.classes.some((c) => c.id === a.id)) return s;
      const sha = nextSha(s.shaIdx);
      const done = commitRevoke(s.classes, s.ledger, a.id, a.to, sha, a.t);
      return { ...s, ...done, shaIdx: s.shaIdx + 1, sel: a.id, just: a.id };
    }
    case 'settle':
      return { ...s, ...settleCommit(s.classes, s.ledger, a.sha, a.t) };
    case 'clearFresh':
      if (!s.just && !s.ledger.some((e) => e.isNew)) return s;
      return { ...s, just: null, ledger: s.ledger.map((e) => (e.isNew ? { ...e, isNew: false } : e)) };
    case 'reset': {
      // The view (grouping, collapsed tracks) survives a reset; the data, selection and filters do not.
      const fresh = initialState(a.seed);
      return { ...fresh, grouped: s.grouped, collapsed: s.collapsed };
    }
  }
}
