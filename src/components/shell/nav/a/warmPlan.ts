// Arm A's plan (pure): which routes `next dev` is asked to compile before the operator's first click, which skeleton a
// sample path paints, and which click is a pending navigation. `next dev` prefetches nothing (next/dist/client/components/
// app-router-utils.js createPrefetchURL returns null in development; links.js skips viewport prefetching there too), so
// without arm A the first click to a module waits for Turbopack to compile it, and every click leaves the old screen up,
// unchanged, until the server answers.
import type { SkeletonLayout } from '@/components/shell/loading/ScreenSkeleton';
import { sampleKeyOf } from '../navArm';

/** The sample modules' list routes, compiled by one GET each on the first idle frame. */
export const WARM_ROUTES = ['/fleet', '/monitor', '/needs-you'] as const;

/**
 * The detail routes, compiled by one GET each (no id is known before the list loads, so a placeholder one: the page
 * answers its not-found, which is enough for Turbopack to build the route).
 */
export const WARM_COMPILE = ['/fleet/__belay_warm__', '/needs-you/__belay_warm__'] as const;

/** How long the warm pass waits for an idle frame before it runs anyway (ms). */
export const IDLE_TIMEOUT_MS = 2000;

/** A link's href as the same-origin sample path it leads to (query kept, hash dropped), else null. */
export function sampleTarget(href: string | null | undefined, origin: string): string | null {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const path = url.pathname + url.search;
  return sampleKeyOf(path) ? path : null;
}

/** The skeleton a sample path's own loading boundary paints (its loading.tsx or page <Suspense>), else null. */
export function skeletonFor(path: string): { title: string; layout: SkeletonLayout } | null {
  const key = sampleKeyOf(path);
  const detail = (path.split(/[?#]/, 1)[0] ?? '').split('/').length === 3;
  if (key === 'fleet') return detail ? { title: 'Fleet', layout: 'sections' } : { title: 'Belay', layout: 'table' };
  if (key === 'monitor') return { title: 'Monitor', layout: 'lanes' };
  if (key === 'needs-you') return { title: 'Needs you', layout: detail ? 'sections' : 'table' };
  return null;
}

/**
 * The path a click on `href` moves to, when arm A should paint its skeleton at once: a plain primary click the router
 * took (the <Link> called preventDefault), to another same-origin sample path. Else null.
 */
export function pendingTarget(
  click: { button: number; defaultPrevented: boolean; modified: boolean },
  href: string | null | undefined,
  origin: string,
  currentPath: string,
): string | null {
  if (click.button !== 0 || !click.defaultPrevented || click.modified) return null;
  const target = sampleTarget(href, origin);
  if (!target) return null;
  const path = target.split('?', 1)[0] ?? target;
  return path === currentPath ? null : path;
}

/** True when the current path is the Needs-you desk or one of its decisions (the screen that refreshes on activation). */
export function isNeedsYouPath(pathname: string | null | undefined): boolean {
  return !!pathname && sampleKeyOf(pathname) === 'needs-you';
}

/**
 * True when a move from `prev` to `next` brings the Needs-you desk back into view from another module (not a move
 * between the desk and one of its own decisions, and not the first render).
 */
export function entersNeedsYou(prev: string | null, next: string | null): boolean {
  return prev !== null && isNeedsYouPath(next) && !isNeedsYouPath(prev);
}
