'use client';

import type { Ref } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { SearchField } from '@/components/controls/toolbar/SearchField';
import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import type { FleetProject } from '@/lib/demo/types';
import type { FleetView, Source } from '../../model/types';
import { CountDot } from './CountDot';
import { StatusLozenge } from './StatusLozenge';

const VIEWS: readonly SegmentOption<FleetView>[] = [
  { value: 'tiers', label: 'Tiers', title: 'Tier counts per project' },
  { value: 'classes', label: 'Classes', title: 'Tier of each action class' },
  { value: 'stages', label: 'Stages', title: 'Rung on each of the nine stages' },
];

/** The controls of the Fleet toolbar: the three views, the status lozenge, Sort, Filter and Search. */
export function FleetToolbar({
  view,
  onView,
  projects,
  waiting,
  source,
  onSource,
  sortLabel,
  onSortMenu,
  filterCount,
  onFilterMenu,
  query,
  onQuery,
  searchRef,
}: {
  view: FleetView;
  onView: (v: FleetView) => void;
  projects: readonly FleetProject[];
  waiting: number;
  /** No words in the lozenge: the toolbar is too narrow for them. */
  source: Source;
  onSource: (s: Source) => void;
  sortLabel: string;
  onSortMenu: (button: HTMLElement) => void;
  /** Ticks in the Filter menu; the button is tinted when there are any. */
  filterCount: number;
  onFilterMenu: (button: HTMLElement) => void;
  query: string;
  onQuery: (q: string) => void;
  searchRef: Ref<HTMLInputElement>;
}) {
  return (
    <>
      <SegmentedControl label="Columns" options={VIEWS} value={view} onChange={onView} />
      <Spacer />
      <StatusLozenge projects={projects} waiting={waiting} source={source} onSource={onSource} />
      <Spacer />
      <PopupButton icon="sort" title="Sort" onClick={(e) => onSortMenu(e.currentTarget)}>
        {sortLabel}
      </PopupButton>
      <PopupButton icon="filter" title="Filter" active={filterCount > 0} onClick={(e) => onFilterMenu(e.currentTarget)}>
        Filter
        {filterCount ? <CountDot count={filterCount} /> : null}
      </PopupButton>
      <SearchField value={query} onChange={onQuery} label="Search projects" inputRef={searchRef} />
    </>
  );
}
