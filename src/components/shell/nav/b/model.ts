// Arm B's pure rules (the legacy host for the Fleet and Needs-you lists until W1/W2; see legacyKeys.ts): which sidebar clicks the SPA host takes, which history entries it owns, and what each screen's
// first paint looks like. The host (ArmHostB) and the store (store.ts) hold the state; everything decidable lives here.
import type { SkeletonLayout } from '@/components/shell/loading/ScreenSkeleton';
import { legacyKeyOf, type LegacyKey } from './legacyKeys';

/** The key arm B writes into the history entries it pushes: the path the host drew there. */
export const ARM_B_MARK = '__armB';

/** Each screen's window, as its route's loading skeleton draws it (fleet/page.tsx, needs-you/loading.tsx). */
export const SKELETON: Record<LegacyKey, { title: string; layout: SkeletonLayout }> = {
  fleet: { title: 'Belay', layout: 'table' },
  'needs-you': { title: 'Needs you', layout: 'table' },
};

/** The tab titles the routes' metadata sets: the host sets them itself, since a pushState renders no metadata. */
export const DOC_TITLE: Record<LegacyKey, string> = {
  fleet: 'Belay Fleet',
  'needs-you': 'Belay Needs you',
};

/** The path of an href (query and hash dropped). */
export function pathOf(href: string): string {
  return href.split(/[?#]/, 1)[0] ?? '';
}

/**
 * The module whose list screen an href lands on: /fleet, /needs-you (query ignored). A detail page
 * (/fleet/<id>, /needs-you/<id>) is null: the envelope carries no detail, so those stay router navigations.
 */
export function listKeyOf(href: string): LegacyKey | null {
  const key = legacyKeyOf(href);
  return key && pathOf(href) === `/${key}` ? key : null;
}

/** The host's path for a history entry: the marked path when it is the entry's own, else null (the route draws it). */
export function markedPath(state: unknown, pathname: string): string | null {
  if (!state || typeof state !== 'object' || !(ARM_B_MARK in state)) return null;
  const mark = (state as Record<string, unknown>)[ARM_B_MARK];
  return typeof mark === 'string' && mark === pathname && listKeyOf(mark) ? mark : null;
}

export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

/** A plain left click on a list screen's link: the host swaps in place. A modified click (new tab, download) is the browser's. */
export function takesClick(e: ClickLike, href: string): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  return listKeyOf(href) !== null;
}

/**
 * Where a click on `href` goes: the URL the screen last had (its list state lives in the query: fleet's filters) when
 * the link names no query of its own, else the link.
 */
export function targetOf(href: string, last: string | undefined): string {
  if (href.includes('?') || !last) return href;
  return pathOf(last) === pathOf(href) ? last : href;
}

/** Needs you's amber rows wait on a person: on every activation they are re-read, and veiled until the read lands. */
export function veilsOnActivate(key: LegacyKey): boolean {
  return key === 'needs-you';
}
