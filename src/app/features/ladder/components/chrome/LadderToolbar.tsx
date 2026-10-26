'use client';

import type { KeyboardEvent, ReactNode, Ref } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { SearchField } from '@/components/controls/toolbar/SearchField';
import type { Ceiling, LadderSort } from '../../model/types';
import { SORT_NAMES } from '../../model/view/sort';
import { TierFilter } from './TierFilter';
import styles from '../../LadderScreen.module.css';

/** The toolbar: tier filter, the policy lozenge, sort and the name filter. */
export function LadderToolbar(p: {
  /** Null: not read yet (no counts). */
  counts: Record<Ceiling, number> | null;
  total: number | null;
  filt: Ceiling | null;
  onFilter: (tier: Ceiling | null) => void;
  lozenge: ReactNode;
  sort: LadderSort;
  onSortMenu: (el: HTMLElement) => void;
  sortOpen?: boolean;
  q: string;
  onQuery: (q: string) => void;
  searchRef: Ref<HTMLInputElement>;
  onSearchKey: (e: KeyboardEvent) => void;
}) {
  return (
    <>
      <TierFilter counts={p.counts} total={p.total} value={p.filt} onChange={p.onFilter} />
      <Spacer />
      {p.lozenge}
      <Spacer />
      <PopupButton icon="sort" title="Sort" expanded={p.sortOpen} onClick={(e) => p.onSortMenu(e.currentTarget)}>
        {SORT_NAMES[p.sort.key]}
      </PopupButton>
      <div className={styles.search} onKeyDown={p.onSearchKey}>
        <SearchField value={p.q} onChange={p.onQuery} placeholder="Filter classes" label="Filter classes by name" inputRef={p.searchRef} />
      </div>
    </>
  );
}
