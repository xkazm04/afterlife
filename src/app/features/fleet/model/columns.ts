// The columns of the three views and their grid tracks (px at the Smaller setting, scaled by --ui-scale).
import type { TierKey } from '@/lib/demo/types';
import { CLASS_SHORT, STAGE_SHORT } from '@/lib/demo/labels';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import { minWidth, px, range, repeatPx } from '@/components/table/model/columns';
import type { FleetMeta, FleetView, SortKey } from './types';

export type ColumnKind = 'name' | 'state' | 'needs' | 'tier' | 'class' | 'stage' | 'proofs' | 'stages' | 'feed';

export interface ColumnSpec {
  key: SortKey;
  kind: ColumnKind;
  label: string;
  tip: string;
  align: 'start' | 'center' | 'end';
  tier?: TierKey;
  classId?: string;
  stage?: number;
}

const PROOFS: ColumnSpec = { key: 'proofs', kind: 'proofs', label: 'Proofs', tip: 'Proofs, last 7 days', align: 'start' };
const FEED: ColumnSpec = { key: 'feed', kind: 'feed', label: 'Feed', tip: 'Feed age', align: 'end' };
const STAGES: ColumnSpec = { key: 'stages', kind: 'stages', label: 'Stages', tip: 'Rung on the nine stages', align: 'start' };

const BASE: readonly ColumnSpec[] = [
  { key: 'name', kind: 'name', label: 'Project', tip: 'Project', align: 'start' },
  { key: 'state', kind: 'state', label: '', tip: 'State', align: 'center' },
  { key: 'needs', kind: 'needs', label: '', tip: 'Needs you', align: 'center' },
];

export function fleetColumns(view: FleetView, meta: FleetMeta): ColumnSpec[] {
  if (view === 'tiers') {
    const tiers = TIER_DISPLAY_ORDER.map((t): ColumnSpec => ({
      key: `tier:${t}`,
      kind: 'tier',
      label: TIER_META[t].name,
      tip: `${TIER_META[t].name} — ${meta.tiers[t].means}. Click to rank by it.`,
      align: 'start',
      tier: t,
    }));
    return [...BASE, ...tiers, PROOFS, STAGES, FEED];
  }
  if (view === 'classes') {
    const classes = meta.classes.map((c): ColumnSpec => ({ key: `class:${c}`, kind: 'class', label: CLASS_SHORT[c] ?? c, tip: c, align: 'center', classId: c }));
    return [...BASE, ...classes, PROOFS, FEED];
  }
  const stages = meta.stages.map((s, i): ColumnSpec => ({ key: `stage:${i}`, kind: 'stage', label: STAGE_SHORT[s] ?? s, tip: `${s} — rung 0–4`, align: 'start', stage: i }));
  return [...BASE, ...stages, PROOFS, FEED];
}

export interface GridSpec {
  columns: string;
  minWidth: string;
}

const NAME = range(150, 240);

/** Grid tracks of the data columns (the table adds the filler). A narrow pane drops the tier pips and name. */
export function gridFor(view: FleetView, narrow: boolean): GridSpec {
  const lead = `${NAME} ${px(24)} ${px(44)}`;
  if (view === 'tiers') {
    const tiers = repeatPx(5, narrow ? 50 : 88);
    return { columns: `${lead} ${tiers} ${px(96)} ${px(66)} ${px(52)}`, minWidth: minWidth(narrow ? 684 : 872) };
  }
  if (view === 'classes') return { columns: `${lead} ${repeatPx(12, 42)} ${px(96)} ${px(52)}`, minWidth: minWidth(870) };
  return { columns: `${lead} ${repeatPx(9, 54)} ${px(96)} ${px(52)}`, minWidth: minWidth(852) };
}
