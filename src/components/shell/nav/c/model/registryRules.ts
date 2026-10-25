// Arm C's rules (hybrid registry): which sample screen the client copy shows, when the copy steps aside for the real
// route, when it refreshes and when it must say it is stale. Pure; the store (registry.ts) and the host (HostC.tsx) apply them.
import { sampleKeyOf, type ArmScreenKey } from '../../navArm';

/**
 * Screens whose copy steps aside once the real route has landed. Needs you's desk state (the outbox) lives in the
 * /needs-you layout's store, shared with the decision pages: a second store in a kept copy would split the outbox, so its
 * copy only covers the wait and the route's own screen takes over. Fleet and Monitor share no store with another route,
 * so their copy stays the visible one (state kept across tabs) and the route's children stay hidden under it.
 */
export const HANDOVER: ReadonlySet<ArmScreenKey> = new Set(['needs-you']);

/** Screens that refetch on every activation: their amber rows wait for a person and must not be drawn stale as fresh. */
export const ALWAYS_FRESH: ReadonlySet<ArmScreenKey> = new Set(['needs-you']);

/** A quiet refresh (landing, an RSC refresh) skips a copy read this recently (ms). */
export const QUIET_MIN_AGE_MS = 3_000;

/** An always-fresh copy older than this (ms) is drawn with the 'updating' affordance until its refetch lands. */
export const STALE_AFTER_MS = 5_000;

/** The sample screen an href or pathname is exactly (/fleet, /monitor, /needs-you; query, hash, trailing slash ignored). */
export function screenKeyOf(href: string): ArmScreenKey | null {
  const path = (href.split(/[?#]/, 1)[0] ?? '').replace(/\/+$/, '');
  const key = sampleKeyOf(path);
  return key && path === `/${key}` ? key : null;
}

/**
 * The copy a sidebar click (or a back/forward) to `href` activates from `fromPath`, or null to leave it to the route:
 * not a sample screen, already that screen, or a handover screen reached from inside its own module (its store is there).
 */
export function intentTarget(fromPath: string, href: string): ArmScreenKey | null {
  const key = screenKeyOf(href);
  if (!key || screenKeyOf(fromPath) === key) return null;
  if (HANDOVER.has(key) && sampleKeyOf(fromPath) === key) return null;
  return key;
}

/**
 * The active copy once the router's pathname has moved to `path`: kept when it is that screen; otherwise a non-handover
 * screen reached some other way (a palette link, a detail page's back link) is shown from the copy when one is held.
 */
export function afterPathname(active: ArmScreenKey | null, path: string, hasProps: (k: ArmScreenKey) => boolean): ArmScreenKey | null {
  const key = screenKeyOf(path);
  if (!key) return null;
  if (active === key) return key;
  if (HANDOVER.has(key)) return null;
  return hasProps(key) ? key : null;
}

/** What the host knows of one copy. */
export interface CopyView {
  hasProps: boolean;
  failed: boolean;
  loading: boolean;
  /** When its props were read (epoch ms), null before the first read. */
  fetchedAt: number | null;
  /** The running refetch replaces props older than STALE_AFTER_MS. */
  stale: boolean;
}

/** Whether `key`'s copy is the visible screen (the route's children are hidden while one is). */
export function copyShows(key: ArmScreenKey, active: ArmScreenKey | null, landed: boolean, v: CopyView): boolean {
  if (active !== key) return false;
  if (v.failed && !v.hasProps) return false; // nothing to draw: the route's own skeleton and screen
  return !(HANDOVER.has(key) && landed);
}

export function quietRefreshDue(fetchedAt: number | null, now: number): boolean {
  return fetchedAt === null || now - fetchedAt >= QUIET_MIN_AGE_MS;
}

export function activationRefreshDue(key: ArmScreenKey, fetchedAt: number | null, now: number): boolean {
  return ALWAYS_FRESH.has(key) || quietRefreshDue(fetchedAt, now);
}

/** Whether a refetch that starts at `now` replaces a copy old enough to need the affordance (always-fresh screens only). */
export function staleAtStart(key: ArmScreenKey, fetchedAt: number | null, now: number): boolean {
  return ALWAYS_FRESH.has(key) && fetchedAt !== null && now - fetchedAt > STALE_AFTER_MS;
}

/** The affordance an always-fresh copy carries while its last-known props may be stale, or null when it needs none. */
export function staleNote(key: ArmScreenKey, v: CopyView): 'updating' | 'failed' | null {
  if (!ALWAYS_FRESH.has(key) || !v.hasProps) return null;
  if (v.failed) return 'failed';
  return v.loading && v.stale ? 'updating' : null;
}