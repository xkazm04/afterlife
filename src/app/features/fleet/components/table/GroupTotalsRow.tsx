'use client';

import { memo } from 'react';
import { Cell } from '@/components/table/Cell';
import { GroupRow } from '@/components/table/GroupRow';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StageMeter } from '@/components/viz/StageMeter';
import type { FleetProject, TierKey } from '@/lib/demo/types';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { needsSum, proofsSum, stageAverage, tierTotal } from '../../model/groups';
import { columnRole } from '../../model/list/sorting';
import type { FleetMeta, FleetView } from '../../model/types';
import { ProofsCell } from './cells/ProofsCell';
import { TierTotalCell } from './cells/TierTotalCell';
import cells from './cells/cells.module.css';
import type { RowHandlers } from './types';

export interface GroupTotalsRowProps {
  group: string;
  list: readonly FleetProject[];
  view: FleetView;
  ranked: TierKey | null;
  meta: FleetMeta;
  expanded: boolean;
  selected: boolean;
  h: RowHandlers;
}

function TotalCells({ list, view, ranked, meta }: Pick<GroupTotalsRowProps, 'list' | 'view' | 'ranked' | 'meta'>) {
  if (view === 'tiers') return TIER_DISPLAY_ORDER.map((t) => <TierTotalCell key={t} tier={t} total={tierTotal(list, t)} role={columnRole(t, ranked)} />);
  if (view === 'classes') return meta.classes.map((c) => <Cell key={c} />);
  return meta.stages.map((s, i) => {
    const avg = stageAverage(list, i);
    return <Cell key={s}>{avg === null ? null : <StageMeter rung={avg} />}</Cell>;
  });
}

/** A collapsible group header with the group's totals in the same columns as its projects. */
export const GroupTotalsRow = memo(function GroupTotalsRow({ group, list, view, ranked, meta, expanded, selected, h }: GroupTotalsRowProps) {
  const waiting = needsSum(list);
  return (
    <GroupRow id={group} label={group} count={list.length} expanded={expanded} selected={selected} onSelect={h.onSelect} onToggle={h.onToggleGroup} onContextMenu={h.onGroupContextMenu}>
      <Cell />
      <Cell align="center">
        <NeedsYouBadge count={waiting} variant="group" title={`${waiting} waiting in ${group}`} />
      </Cell>
      <TotalCells list={list} view={view} ranked={ranked} meta={meta} />
      <Cell className={cells.pc}>
        <ProofsCell proofs={proofsSum(list)} />
      </Cell>
      {view === 'tiers' ? <Cell /> : null}
      <Cell />
    </GroupRow>
  );
});
