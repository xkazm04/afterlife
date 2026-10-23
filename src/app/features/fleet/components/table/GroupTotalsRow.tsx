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
import { sumCost } from '@/lib/runs/desk/join';
import type { FleetEstate, FleetMeta, FleetView } from '../../model/types';
import { CostTotalCell } from './cells/CostTotalCell';
import { RedRateCell } from './cells/RedRateCell';
import { ProofsCell } from './cells/ProofsCell';
import { TierTotalCell } from './cells/TierTotalCell';
import { GroupTrend } from '../trend/GroupTrend';
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
  /**
   * Read beside the fleet: the group's agent spend and red pipelines sum its projects' (absent or not read: an empty cell),
   * and its needs carry their change since last week.
   */
  estate?: FleetEstate;
}

function TotalCells({ list, view, ranked, meta }: Pick<GroupTotalsRowProps, 'list' | 'view' | 'ranked' | 'meta'>) {
  if (view === 'tiers') return TIER_DISPLAY_ORDER.map((t) => <TierTotalCell key={t} tier={t} total={tierTotal(list, t)} role={columnRole(t, ranked)} />);
  if (view === 'classes') return meta.classes.map((c) => <Cell key={c} />);
  return meta.stages.map((s, i) => {
    const avg = stageAverage(list, i);
    return <Cell key={s}>{avg === null ? null : <StageMeter rung={avg} />}</Cell>;
  });
}

/**
 * A collapsible group header with the group's totals in the same columns as its projects; in the Tiers view the stages
 * column carries its agent MRs' red pipelines, and the feed column its agent spend.
 */
export const GroupTotalsRow = memo(function GroupTotalsRow({ group, list, view, ranked, meta, expanded, selected, h, estate }: GroupTotalsRowProps) {
  const waiting = needsSum(list);
  const cost = estate?.cost ? sumCost(estate.cost.byProject, list.map((p) => p.id)) : null;
  return (
    <GroupRow id={group} label={group} count={list.length} expanded={expanded} selected={selected} onSelect={h.onSelect} onToggle={h.onToggleGroup} onContextMenu={h.onGroupContextMenu}>
      <Cell />
      <Cell align="center">
        <NeedsYouBadge count={waiting} variant="group" title={`${waiting} waiting in ${group}`} />
        {estate?.trend ? <GroupTrend feed={estate.trend} group={group} /> : null}
      </Cell>
      <TotalCells list={list} view={view} ranked={ranked} meta={meta} />
      <Cell className={cells.pc}>
        <ProofsCell proofs={list.some((p) => p.proofs7d) ? proofsSum(list) : null} />
      </Cell>
      {view === 'tiers' ? <RedRateCell list={estate?.stability ? list.map((p) => estate.stability?.[p.id]) : []} group={group} /> : null}
      <CostTotalCell sum={cost} group={group} />
    </GroupRow>
  );
});
