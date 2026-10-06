// Which projects the list shows: the source (all / a group / a smart filter), the search text and the two menus.
import type { FleetProject, ProjectState, TierKey } from '@/lib/demo/types';
import { smartFilter } from './smartFilters';
import type { FleetFilters, SmartId, Source } from '../types';

export const EMPTY_FILTERS: FleetFilters = { source: 'all', q: '', states: new Set(), tiers: new Set() };

export const isGroupSource = (s: Source): s is `g:${string}` => s.startsWith('g:');

export function matchesSource(p: FleetProject, source: Source): boolean {
  if (source === 'all') return true;
  if (isGroupSource(source)) return p.group === source.slice(2);
  return smartFilter(source as SmartId).test(p);
}

export function matchesSearch(p: FleetProject, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return p.name.toLowerCase().includes(needle) || p.group.includes(needle) || (p.what || '').toLowerCase().includes(needle);
}

export function filterProjects(projects: readonly FleetProject[], f: FleetFilters): FleetProject[] {
  return projects.filter(
    (p) =>
      matchesSource(p, f.source) &&
      (f.states.size === 0 || f.states.has(p.state)) &&
      (f.tiers.size === 0 || [...f.tiers].some((t) => p.tiers[t] > 0)) &&
      matchesSearch(p, f.q),
  );
}

/** The number in the status bar: source, search and each ticked menu item count one. */
export function filterCount(f: FleetFilters): number {
  return (f.source !== 'all' ? 1 : 0) + (f.q.trim() ? 1 : 0) + f.states.size + f.tiers.size;
}

/** The number on the Filter button: only the menu's own ticks. */
export const menuFilterCount = (f: FleetFilters): number => f.states.size + f.tiers.size;

export function toggleIn<T extends ProjectState | TierKey>(set: ReadonlySet<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

/** The toolbar subtitle part after the portfolio name. */
export function sourceLabel(source: Source): string {
  if (source === 'all') return 'All projects';
  if (isGroupSource(source)) return source.slice(2);
  return smartFilter(source as SmartId).label;
}
