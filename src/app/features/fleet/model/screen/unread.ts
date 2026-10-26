// The fleet before its core slice is read: an empty fleet the hooks can hold (no rows, no groups, nothing to act on),
// never shown as a fleet of zero (the screen draws dashes while `read` is false), and the list state fitted to a fleet
// only once one is read, so a bookmarked group or column is kept until the fleet says it does not have it. Pure.
import type { TierInfo, TierKey } from '@/lib/demo/types';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import { fleetColumns } from '../columns';
import { fitGroups, type FleetListState } from '../list/urlState';
import { INITIAL_SORT } from '../list/sorting';
import type { FleetData, FleetMeta } from '../types';

const UNREAD_TIERS = Object.fromEntries(TIER_DISPLAY_ORDER.map((t) => [t, { label: TIER_META[t].name, means: 'not read yet' }])) as Record<TierKey, TierInfo>;

/** No fleet yet: what the hooks hold until the core slice lands. One constant, so its identity marks "unread". */
export const UNREAD_FLEET: FleetData = Object.freeze({
  portfolio: '',
  projects: [],
  groups: [],
  classes: [],
  stages: [],
  tiers: UNREAD_TIERS,
  deepId: '',
  records: {},
  lastPollSec: null,
});

/** A bookmarked sort on a class or stage this fleet does not draw (renamed, dropped) would rank by no column: the default instead. */
export function fitColumns(s: FleetListState, meta: FleetMeta): FleetListState {
  const k = s.sort.key;
  if (!/^(class|stage):/.test(k) || fleetColumns(s.view, meta).some((c) => c.key === k)) return s;
  return { ...s, sort: INITIAL_SORT };
}

/** The list state against a read fleet (its groups and columns); unread: as it is. */
export function fitList(s: FleetListState, data: FleetData | undefined): FleetListState {
  if (!data) return s;
  return fitColumns(fitGroups(s, data.groups), { classes: data.classes, stages: data.stages, tiers: data.tiers });
}

/**
 * What the list does when its inputs move (hooks/useFleetList): the URL asks for a state the list does not show ('from':
 * back, forward, a link to another filter), or the fleet's shape changed ('fit' the state as it is: the person's choices
 * made meanwhile are kept), or nothing. A URL that only caught up with the list (its own replaceState) changes nothing.
 * `urlQuery`: the address bar's own list query while it shows this screen; a `fromQuery` that disagrees with it is a
 * passing value (the host's, between two renders of a back navigation), never taken over the list.
 */
export function listReseed(seen: { q: string; fit: string }, fromQuery: string, key: string, currentQuery: string, urlQuery?: string): 'from' | 'fit' | null {
  if (seen.q === fromQuery && seen.fit === key) return null;
  const asked = seen.q !== fromQuery && fromQuery !== currentQuery && (urlQuery === undefined || urlQuery === fromQuery);
  return asked ? 'from' : 'fit';
}

/** What a fit depends on: a new fleet shape (another group, column) fits the state again; the same one does not. */
export const fitKey = (data: FleetData | undefined): string => (data ? JSON.stringify([data.groups, data.classes, data.stages]) : '');
