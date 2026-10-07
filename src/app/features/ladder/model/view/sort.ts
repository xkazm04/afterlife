// Sorting of the class table. The order is FROZEN when the sort changes, so a revoke never moves rows under the cursor.
import { sortItems, type SortDir, type SortValue } from '@/components/table/model/sort';
import { cellRank, TIER_RANK } from '@/lib/tiers';
import { cellOf, holdersOf } from '../rules/tiers';
import type { ClassRow, LadderSort, LedgerEntry, SortKey } from '../types';
import { lastMoveIndex } from './moves';

export const SORT_NAMES: Readonly<Record<SortKey, string>> = {
  move: 'Last move',
  name: 'Class',
  track: 'Track',
  tier: 'Tier',
  ceiling: 'Ceiling',
  lease: 'Lease',
  acc: 'Accepted',
  noedit: 'No-edit',
  rv: 'Reverts',
  clean: 'Clean days',
};
export const SORT_KEYS = Object.keys(SORT_NAMES) as SortKey[];

export const INITIAL_SORT: LadderSort = { key: 'move', dir: -1 };

/** Text columns start ascending, number columns start with the largest. */
export const defaultDir = (key: SortKey): SortDir => (key === 'name' || key === 'track' ? 1 : -1);

/** A header click: the same column flips, another column starts at its default direction. */
export function toggleSort(sort: LadderSort, key: SortKey): LadderSort {
  return sort.key === key ? { key, dir: (sort.dir * -1) as SortDir } : { key, dir: defaultDir(key) };
}

/** null means "no record": it sinks to the bottom whichever way the column runs. */
export function sortValue(c: ClassRow, key: SortKey, ledger: readonly LedgerEntry[]): SortValue {
  const r = c.record;
  switch (key) {
    case 'move': return lastMoveIndex(ledger, c.id);
    case 'name': return c.id;
    case 'track': return c.track;
    case 'tier': return cellRank(cellOf(c), holdersOf(c));
    case 'ceiling': return TIER_RANK[c.ceiling];
    case 'lease': return c.lease_days || null;
    case 'acc': return r ? r.accepted : null;
    case 'noedit': return r ? r.noEdit : null;
    case 'rv': return r ? r.reverts : null;
    case 'clean': return r ? r.cleanDays : null;
  }
}

/** The class ids in display order. Ties keep their original order. */
export function computeOrder(classes: readonly ClassRow[], ledger: readonly LedgerEntry[], sort: LadderSort): string[] {
  return sortItems(classes, sort, { getValue: (c, k) => sortValue(c, k, ledger) }).map((c) => c.id);
}
