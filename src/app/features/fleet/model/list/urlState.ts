// The list's view state as URL search params, so Back and a reload restore it. Pure: decode never throws and falls back to
// the defaults for anything it does not know; the default state encodes to the empty string (a clean URL).
import type { ProjectState, TierKey } from '@/lib/demo/types';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import type { SortDir, SortState } from '@/components/table/model/sort';
import type { FleetFilters, FleetView, SmartId, SortKey, Source } from '../types';
import { EMPTY_FILTERS } from './filtering';
import { INITIAL_SORT, defaultDir } from './sorting';

export interface FleetListState {
  view: FleetView;
  sort: SortState<SortKey>;
  grouped: boolean;
  collapsed: ReadonlySet<string>;
  filters: FleetFilters;
}

export const DEFAULT_LIST_STATE: FleetListState = {
  view: 'tiers',
  sort: INITIAL_SORT,
  grouped: true,
  collapsed: new Set(),
  filters: EMPTY_FILTERS,
};

/** The shape of a page's `searchParams` prop. */
export type RawParams = Record<string, string | string[] | undefined>;

const VIEWS: readonly FleetView[] = ['tiers', 'classes', 'stages'];
const STATES: readonly ProjectState[] = ['watching', 'setting-up', 'stale', 'not-set-up'];
const SMART: readonly SmartId[] = ['needs', 'stale', 'setup', 'unwatched', 'quar', 'handsoff'];
const PLAIN_SORTS = ['attention', 'name', 'state', 'needs', 'proofs', 'stages', 'feed'];

const all = (p: RawParams, k: string): string[] => {
  const v = p[k];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
};
const first = (p: RawParams, k: string): string | undefined => all(p, k)[0];

const isSource = (s: string): s is Source => s === 'all' || s === 'changed' || (SMART as readonly string[]).includes(s) || (s.startsWith('g:') && s.length > 2);
const isSortKey = (s: string): s is SortKey =>
  PLAIN_SORTS.includes(s) ||
  (s.startsWith('tier:') && (TIER_DISPLAY_ORDER as readonly string[]).includes(s.slice(5))) ||
  (s.startsWith('class:') && s.length > 6) ||
  /^stage:\d{1,3}$/.test(s);

/** A sort on a column only the other views have is dropped. */
const fitsView = (key: SortKey, view: FleetView): boolean =>
  key.startsWith('tier:') ? view === 'tiers' : key.startsWith('class:') ? view === 'classes' : key.startsWith('stage:') ? view === 'stages' : key !== 'stages' || view === 'tiers';

/** Search params (or a URLSearchParams) to list state. Unknown or malformed values are ignored. */
export function decodeListState(raw: RawParams | URLSearchParams | null | undefined): FleetListState {
  try {
    const p: RawParams = raw instanceof URLSearchParams ? Object.fromEntries([...new Set(raw.keys())].map((k) => [k, raw.getAll(k)])) : (raw ?? {});
    const v = first(p, 'view');
    const view = VIEWS.find((x) => x === v) ?? DEFAULT_LIST_STATE.view;
    const key = first(p, 'sort');
    const sortKey = key && isSortKey(key) ? key : INITIAL_SORT.key;
    const d = first(p, 'dir');
    const dir: SortDir = d === 'asc' ? 1 : d === 'desc' ? -1 : sortKey === INITIAL_SORT.key ? INITIAL_SORT.dir : defaultDir(sortKey);
    const src = first(p, 'src');
    return {
      view,
      sort: fitsView(sortKey, view) ? { key: sortKey, dir } : INITIAL_SORT,
      grouped: first(p, 'flat') !== '1',
      collapsed: new Set(all(p, 'fold').filter(Boolean)),
      filters: {
        source: src && isSource(src) ? src : 'all',
        q: first(p, 'q') ?? '',
        states: new Set(STATES.filter((s) => all(p, 'state').includes(s))),
        tiers: new Set<TierKey>(TIER_DISPLAY_ORDER.filter((t) => all(p, 'tier').includes(t))),
      },
    };
  } catch {
    return DEFAULT_LIST_STATE;
  }
}

/** List state to a query string without the "?". Only what differs from the default is written. */
export function encodeListState(s: FleetListState): string {
  const p = new URLSearchParams();
  if (s.view !== 'tiers') p.set('view', s.view);
  if (s.sort.key !== INITIAL_SORT.key || s.sort.dir !== INITIAL_SORT.dir) {
    p.set('sort', s.sort.key);
    if (s.sort.dir !== defaultDir(s.sort.key)) p.set('dir', s.sort.dir === 1 ? 'asc' : 'desc');
  }
  if (s.filters.source !== 'all') p.set('src', s.filters.source);
  if (s.filters.q) p.set('q', s.filters.q);
  [...s.filters.states].sort().forEach((x) => p.append('state', x));
  [...s.filters.tiers].sort().forEach((x) => p.append('tier', x));
  if (!s.grouped) p.set('flat', '1');
  [...s.collapsed].sort().forEach((g) => p.append('fold', g));
  return p.toString();
}
