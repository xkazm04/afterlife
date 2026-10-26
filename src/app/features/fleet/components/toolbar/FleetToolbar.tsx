'use client';

import type { Ref } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { SearchField } from '@/components/controls/toolbar/SearchField';
import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import type { FleetProject } from '@/lib/demo/types';
import { STAGES } from '@/schemas/stages';
import type { FleetView, Source } from '../../model/types';
import { CountDot } from './CountDot';
import { StatusLozenge } from './StatusLozenge';

const VIEWS: readonly SegmentOption<FleetView>[] = [
  { value: 'tiers', label: 'Tiers', title: 'Tier counts per project' },
  { value: 'classes', label: 'Classes', title: 'Tier of each action class' },
  { value: 'stages', label: 'Stages', title: `Rung on each of the ${STAGES.length} stages` },
];

/** The controls of the Fleet toolbar: the three views, the status lozenge, Sort, Filter and Search. */
export function FleetToolbar({
  view,
  onView,
  projects,
  waiting,
  compact,
  source,
  onSource,
  sortLabel,
  onSortMenu,
  sortOpen,
  filterCount,
  onFilterMenu,
  filterOpen,
  query,
  onQuery,
  searchRef,
  unread = false,
}: {
  view: FleetView;
  onView: (v: FleetView) => void;
  projects: readonly FleetProject[];
  waiting: number;
  /** No words in the lozenge: the toolbar is too narrow for them. */
  compact: boolean;
  source: Source;
  onSource: (s: Source) => void;
  sortLabel: string;
  onSortMenu: (button: HTMLElement) => void;
  sortOpen?: boolean;
  filterOpen?: boolean;
  /** Ticks in the Filter menu; the button is tinted when there are any. */
  filterCount: number;
  onFilterMenu: (button: HTMLElement) => void;
  query: string;
  onQuery: (q: string) => void;
  searchRef: Ref<HTMLInputElement>;
  /** The fleet is not read yet: the lozenge's counts are dashes. */
  unread?: boolean;
}) {
  return (
    <>
      <SegmentedControl label="Columns" options={VIEWS} value={view} onChange={onView} />
      <Spacer />
      <StatusLozenge projects={projects} waiting={waiting} compact={compact} source={source} onSource={onSource} unread={unread} />
      <Spacer />
      <PopupButton icon="sort" title={`Sort by ${sortLabel}`} expanded={sortOpen} onClick={(e) => onSortMenu(e.currentTarget)}>
        {sortLabel}
      </PopupButton>
      <PopupButton icon="filter" title={filterCount ? `Filter, ${filterCount} on` : 'Filter'} active={filterCount > 0} expanded={filterOpen} onClick={(e) => onFilterMenu(e.currentTarget)}>
        Filter
        {filterCount ? <CountDot count={filterCount} /> : null}
      </PopupButton>
      <SearchField value={query} onChange={onQuery} label="Search projects" inputRef={searchRef} />
    </>
  );
}
