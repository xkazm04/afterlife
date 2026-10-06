'use client';

import { useCallback, useMemo, useState } from 'react';
import { nextSort, type SortDir, type SortState } from './model/sort';

export interface UseSortOptions<K extends string> {
  /** Where the table starts and what a third click on a column returns to. */
  initial: SortState<K>;
  /** First-click direction per column (default -1, largest first). Text columns usually return 1. */
  defaultDir?: (key: K) => SortDir;
}

/**
 * Click-to-sort state for an OutlineTable. `toggle(key)` is the header-click handler (default direction, then
 * flipped, then back to `initial`); `set` jumps straight to a state (from a sort menu); `reset` returns to `initial`.
 * Apply the order with sortItems() from table/model/sort.
 */
export function useSort<K extends string>({ initial, defaultDir }: UseSortOptions<K>) {
  const [sort, set] = useState<SortState<K>>(initial);
  const rules = useMemo(() => ({ initial, defaultDir }), [initial, defaultDir]);
  const toggle = useCallback((key: K) => set((s) => nextSort(s, key, rules)), [rules]);
  const reset = useCallback(() => set(rules.initial), [rules]);
  return { sort, toggle, set, reset };
}
