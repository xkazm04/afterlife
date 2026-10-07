// What the table shows: tier filter, source (all / one track / a smart filter) and the name search.
import { TIER_RANK } from '@/lib/tiers';
import type { PolicyRules } from '@/server/data/types';
import { promotion } from '../rules/promotion';
import type { Ceiling, ClassRow, TrackMap } from '../types';

export interface SmartFilter {
  id: string;
  label: string;
  /** `proofClass` is the class's track proof class and `policy` trust-policy.yml's thresholds (promotion needs both). */
  test: (c: ClassRow, proofClass: string, policy: PolicyRules | null) => boolean;
}

export const SMART_FILTERS: readonly SmartFilter[] = [
  { id: 'promote', label: 'Can promote', test: (c, proof, policy) => promotion(c, proof, policy).kind === 'eligible' },
  {
    id: 'below',
    label: 'Below ceiling',
    test: (c) => c.tier !== 'human_only' && c.tier !== 'quarantined' && TIER_RANK[c.tier] < TIER_RANK[c.ceiling],
  },
  { id: 'leased', label: 'Leased', test: (c) => !!c.lease_days },
  { id: 'quar', label: 'Quarantined', test: (c) => c.tier === 'quarantined' },
  { id: 'pending', label: 'Pending read', test: (c) => !!c.pending },
];

export const ALL_SOURCE = 'all';
const isTrackId = (src: string): boolean => /^T\d$/.test(src);

export const proofClassOf = (tracks: TrackMap, c: Pick<ClassRow, 'track'>): string => tracks[c.track]?.proof.cls ?? '';

/** Does the class belong to the sidebar source (All classes, one track, or a smart filter)? */
export function matchesSource(c: ClassRow, src: string, tracks: TrackMap, policy: PolicyRules | null = null): boolean {
  if (src === ALL_SOURCE) return true;
  if (isTrackId(src)) return c.track === src;
  const smart = SMART_FILTERS.find((s) => s.id === src);
  return smart ? smart.test(c, proofClassOf(tracks, c), policy) : true;
}

/** Name search: the class id, its track id, key and name. */
export function matchesQuery(c: ClassRow, q: string, tracks: TrackMap): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const t = tracks[c.track];
  return `${c.id} ${c.track} ${t?.key ?? ''} ${t?.name ?? ''}`.toLowerCase().includes(needle);
}

export interface Criteria {
  src: string;
  filt: Ceiling | null;
  q: string;
}

/** The classes on screen, in the frozen order. */
export function visibleClasses(order: readonly string[], byId: Readonly<Record<string, ClassRow>>, crit: Criteria, tracks: TrackMap, policy: PolicyRules | null = null): ClassRow[] {
  const out: ClassRow[] = [];
  for (const id of order) {
    const c = byId[id];
    if (c && matchesSource(c, crit.src, tracks, policy) && (!crit.filt || c.tier === crit.filt) && matchesQuery(c, crit.q, tracks)) out.push(c);
  }
  return out;
}

/** How many of the three filters are on (the status bar says "1 filter"). */
export const filterCount = (crit: Criteria): number => (crit.src !== ALL_SOURCE ? 1 : 0) + (crit.filt ? 1 : 0) + (crit.q.trim() ? 1 : 0);

export function tierCounts(classes: readonly ClassRow[]): Record<Ceiling, number> {
  const n: Record<Ceiling, number> = { hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 };
  for (const c of classes) n[c.tier] += 1;
  return n;
}
