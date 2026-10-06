// The entries of the Sort and Filter menus. Pure: state in, entries out; the menu re-asks on every render so a
// ticked item can stay open and show what it just changed.
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import type { SortDir, SortState } from '@/components/table/model/sort';
import { STATE_LABEL } from '@/lib/demo/labels';
import type { ProjectState, TierKey } from '@/lib/demo/types';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import { filterCount } from '../list/filtering';
import { SORT_MENU_KEYS, defaultDir, sortLabel } from '../list/sorting';
import type { FleetFilters, SortKey } from '../types';

export interface SortMenuArgs {
  sort: SortState<SortKey>;
  grouped: boolean;
  stages: readonly string[];
  onSort: (state: SortState<SortKey>) => void;
  onToggleGroups: () => void;
}

export function sortMenu(a: SortMenuArgs): MenuEntry[] {
  const dir = (d: SortDir) => () => a.onSort({ key: a.sort.key, dir: d });
  return [
    { head: 'Sort by' },
    ...SORT_MENU_KEYS.map((k) => ({
      label: sortLabel(k, a.stages),
      checked: a.sort.key === k,
      run: () => a.onSort({ key: k, dir: k === 'attention' ? -1 : defaultDir(k) }),
    })),
    { sep: true },
    { label: 'Ascending', checked: a.sort.dir > 0, disabled: a.sort.key === 'attention', run: dir(1) },
    { label: 'Descending', checked: a.sort.dir < 0, disabled: a.sort.key === 'attention', run: dir(-1) },
    { sep: true },
    { label: 'Show Groups', checked: a.grouped, run: a.onToggleGroups },
  ];
}

export interface FilterMenuArgs {
  filters: FleetFilters;
  onState: (s: ProjectState) => void;
  onTier: (t: TierKey) => void;
  onNeedsOnly: () => void;
  onClear: () => void;
}

const STATES: readonly ProjectState[] = ['watching', 'setting-up', 'stale', 'not-set-up'];

export function filterMenu(a: FilterMenuArgs): MenuEntry[] {
  const f = a.filters;
  return [
    { head: 'State' },
    ...STATES.map((s) => ({ label: STATE_LABEL[s], checked: f.states.has(s), run: () => a.onState(s) })),
    { sep: true },
    { head: 'Has a class at' },
    ...TIER_DISPLAY_ORDER.map((t) => ({ label: TIER_META[t].name, checked: f.tiers.has(t), run: () => a.onTier(t) })),
    { sep: true },
    { label: 'Needs You Only', checked: f.source === 'needs', run: a.onNeedsOnly },
    { label: 'Clear Filters', disabled: filterCount(f) === 0, run: a.onClear },
  ];
}
