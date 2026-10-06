import { INITIAL_HEAD } from '../../data/policy';
import type { ClassRow, LedgerEntry } from '../types';
import { INITIAL_SORT, computeOrder } from '../view/sort';
import type { LadderSeed, LadderState } from './state';

/** The session's first ledger: seed entries with their quotes resolved. */
export function seedLedger(seed: LadderSeed): LedgerEntry[] {
  return seed.ledger.map(({ quoteMr, ...entry }) => {
    const quote = quoteMr ? seed.quotes[quoteMr] : undefined;
    return quote ? { ...entry, ids: [...entry.ids], quote } : { ...entry, ids: [...entry.ids] };
  });
}

/** The demo as it opens: patch-bump selected, newest move first. */
export function initialState(seed: LadderSeed): LadderState {
  const classes: ClassRow[] = seed.classes.map((c) => ({ ...c, record: c.record ? { ...c.record } : null, pending: null }));
  const ledger = seedLedger(seed);
  return {
    classes,
    ledger,
    head: { ...INITIAL_HEAD },
    shaIdx: 0,
    sort: INITIAL_SORT,
    order: computeOrder(classes, ledger, INITIAL_SORT),
    grouped: true,
    collapsed: [],
    filt: null,
    src: 'all',
    q: '',
    sel: 'patch-bump',
    just: null,
  };
}
