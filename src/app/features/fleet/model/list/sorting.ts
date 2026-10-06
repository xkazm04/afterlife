// Sorting the fleet: the "attention" rank and the per-column values. Unknown values always sink (compareValues).
import type { FleetProject, ProjectState, TierKey } from '@/lib/demo/types';
import { STAGE_SHORT } from '@/lib/demo/labels';
import { TIER_META, TIER_RANK } from '@/lib/tiers';
import { sortItems, type SortDir, type SortState, type SortValue } from '@/components/table/model/sort';
import type { FleetView, SortKey } from '../types';

export const INITIAL_SORT: SortState<SortKey> = { key: 'attention', dir: -1 };

export const STATE_RANK: Record<ProjectState, number> = { stale: 3, 'setting-up': 2, 'not-set-up': 1, watching: 0 };

/** Needs-you first, then the sickest state, then by name. */
export function byAttention(a: FleetProject, b: FleetProject): number {
  return b.needsYou - a.needsYou || STATE_RANK[b.state] - STATE_RANK[a.state] || a.name.localeCompare(b.name);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function sortValue(p: FleetProject, key: SortKey): SortValue {
  if (key === 'name') return p.name;
  if (key === 'state') return STATE_RANK[p.state];
  if (key === 'needs') return p.state === 'not-set-up' ? null : p.needsYou;
  if (key.startsWith('tier:')) return p.armed ? p.tiers[key.slice(5) as TierKey] : null;
  if (key.startsWith('class:')) {
    const t = p.classTiers[key.slice(6)];
    return t ? TIER_RANK[t] : null;
  }
  if (key.startsWith('stage:')) return p.stages[Number(key.slice(6))] ?? null;
  if (key === 'stages') {
    const v = p.stages.filter((x): x is number => x != null);
    return v.length ? sum(v) : null;
  }
  if (key === 'proofs') return p.proofs7d ? p.proofs7d.pass - 3 * p.proofs7d.fail : null;
  if (key === 'feed') return p.feed.ageSec;
  return 0;
}

/** First-click direction: names and states ascending, everything else largest first. */
export const defaultDir = (key: SortKey): SortDir => (key === 'name' || key === 'state' ? 1 : -1);

export function sortProjects(projects: readonly FleetProject[], sort: SortState<SortKey>): FleetProject[] {
  return sortItems(projects, sort, { getValue: sortValue, tiebreak: byAttention, custom: { attention: byAttention } });
}

/** The tier column the list is ranked by, if any. */
export const rankedTier = (sort: SortState<SortKey>): TierKey | null => (sort.key.startsWith('tier:') ? (sort.key.slice(5) as TierKey) : null);

/** Ranking by a tier tints its column and dims the other four. */
export type ColumnRole = 'ranked' | 'dim' | 'plain';
export const columnRole = (tier: TierKey, ranked: TierKey | null): ColumnRole => (ranked === null ? 'plain' : ranked === tier ? 'ranked' : 'dim');

/** Switching view drops a sort on a column the new view does not have. */
export function sortAfterViewChange(sort: SortState<SortKey>, view: FleetView): SortState<SortKey> {
  const gone = /^(class|stage|tier):/.test(sort.key) || (sort.key === 'stages' && view !== 'tiers');
  return gone ? INITIAL_SORT : sort;
}

const SORT_NAMES: Record<string, string> = { attention: 'Attention', name: 'Name', state: 'State', needs: 'Needs you', proofs: 'Proofs', stages: 'Stages', feed: 'Feed age' };

/** The name shown on the Sort button and in the sort menu. */
export function sortLabel(key: SortKey, stages: readonly string[]): string {
  const known = SORT_NAMES[key];
  if (known) return known;
  if (key.startsWith('tier:')) return TIER_META[key.slice(5) as TierKey].name;
  if (key.startsWith('class:')) return key.slice(6);
  const stage = stages[Number(key.slice(6))] ?? '';
  return STAGE_SHORT[stage] ?? stage;
}

/** The keys of the sort menu, in order. */
export const SORT_MENU_KEYS: readonly SortKey[] = [
  'attention', 'name', 'needs', 'tier:hands_off', 'tier:supervised', 'tier:assisted', 'tier:quarantined', 'tier:human_only', 'proofs', 'stages', 'feed',
];
