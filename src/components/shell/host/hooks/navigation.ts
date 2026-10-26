'use client';

// The host's navigation: push/replace a claimed URL and draw it here (no router navigation, no RSC request), follow
// back/forward, and take plain clicks on in-app links anywhere in the document. Next's patched pushState/replaceState
// copy its own history state (__NA, its tree) into ours and sync usePathname, and its HistoryUpdater preserves our mark.
import { inAppHref, plainClick } from '../model/click';
import { matchRoute } from '../model/routes';
import { activate, getState, hostConfig, keepSearch, markSeen, read } from './store';

/** The key the host writes into the history entries it pushes (diagnostic: the URL, not the mark, decides). */
export const HOST_MARK = '__host';

let mounted = false;

/** A navigation the legacy arm-B host (nav/b, fleet and needs-you lists until W1/W2) takes; set by ScreenHost. */
let legacy: { takes: (href: string) => boolean; navigate: (href: string) => void } | null = null;

export function setLegacy(l: typeof legacy): void {
  legacy = l;
}

const hereHref = () => window.location.pathname + window.location.search;

/** Follow the URL the browser is on: `reread` for a navigation (back/forward, the router's), not for a query-only change. */
export function syncFromLocation(reread: boolean): void {
  activate(matchRoute(window.location.pathname, window.location.search), reread);
}

/** Where a link with no query of its own goes: back to the query the screen was left with (fleet's filters live there). */
function withKeptQuery(url: URL): string {
  const m = matchRoute(url.pathname);
  const kept = m ? getState().locs[m.key] : undefined;
  if (url.search || !kept || kept.path !== m?.path || !kept.search) return url.pathname + url.search + url.hash;
  return `${url.pathname}?${kept.search}${url.hash}`;
}

/** True when the host draws `href` (mounted, and its key is claimed). */
export function hostClaims(href: string): boolean {
  if (!mounted) return false;
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  const m = matchRoute(url.pathname);
  return m !== null && hostConfig().isReady(m.key);
}

/** Push `href` and draw it here. False (nothing done) when the host does not claim it: the caller uses the router. */
export function hostNavigate(href: string): boolean {
  if (!hostClaims(href)) return false;
  const target = withKeptQuery(new URL(href, window.location.href));
  const url = new URL(target, window.location.href);
  if (url.pathname + url.search === hereHref()) return true; // already here: a click on the current tab does nothing
  keepSearch(window.location.pathname, window.location.search); // a screen's own replaceState (fleet's filters) told nobody
  const m = matchRoute(url.pathname, url.search);
  window.history.pushState({ [HOST_MARK]: m?.key }, '', target);
  syncFromLocation(true);
  return true;
}

/** Replace the current entry with `href` and draw it here (a redirect, a screen's own URL change). False: not claimed. */
export function hostReplace(href: string): boolean {
  if (!hostClaims(href)) return false;
  const url = new URL(href, window.location.href);
  const m = matchRoute(url.pathname, url.search);
  window.history.replaceState({ [HOST_MARK]: m?.key }, '', url.pathname + url.search + url.hash);
  syncFromLocation(true);
  return true;
}

/** Re-read a screen's stream quietly (default: the one showing). A visited screen not showing re-reads when it next shows. */
export function hostRevalidate(key = getState().loc?.key): void {
  if (key && getState().loc?.key === key) read(key);
}

function anchorOf(target: EventTarget | null): HTMLAnchorElement | SVGAElement | null {
  const el = target instanceof Element ? target.closest('a[href]') : null;
  return el instanceof HTMLAnchorElement || el instanceof SVGAElement ? el : null;
}

function onClick(e: MouseEvent): void {
  if (!plainClick(e)) return;
  const a = anchorOf(e.target);
  if (!a) return;
  const href = inAppHref(
    { href: a.getAttribute('href'), target: a.getAttribute('target') ?? '', download: a.hasAttribute('download'), optedOut: a.closest('[data-host-nav="off"]') !== null },
    { origin: window.location.origin, pathname: window.location.pathname, search: window.location.search, href: window.location.href },
  );
  if (!href) return;
  if (hostClaims(href)) {
    e.preventDefault();
    hostNavigate(href);
  } else if (legacy?.takes(href)) {
    e.preventDefault();
    legacy.navigate(href);
    syncFromLocation(true); // the host steps aside in the same task: the legacy host draws the list
  }
}

const onPop = () => syncFromLocation(true);

/** The query changed under the same screen (router.replace('?..'), a pushState of the screen's own): no re-read. */
export function followSearch(): void {
  const loc = getState().loc;
  const m = matchRoute(window.location.pathname, window.location.search);
  if (loc && m && m.path === loc.path && m.search.toString() !== loc.search) activate(m, false);
}

/**
 * Next rendered `pathname` (ScreenHost's effect). When the URL is not where the host put it (a router push to a claimed
 * route, a server redirect, a Link the host did not take), follow it; a pathname that only caught up with the host's own
 * pushState changes nothing.
 */
export function followRouter(pathname: string): void {
  markSeen(pathname);
  const m = matchRoute(window.location.pathname, window.location.search);
  const claimed = m && hostConfig().isReady(m.key) ? m.path : null;
  if (claimed !== (getState().loc?.path ?? null)) syncFromLocation(true);
}

/** Mount the host's listeners (ScreenHost's effect); returns the cleanup. Capture phase on window: before React and next/link. */
export function installHost(): () => void {
  mounted = true;
  window.addEventListener('click', onClick, true);
  window.addEventListener('popstate', onPop);
  markSeen(window.location.pathname);
  syncFromLocation(true);
  return () => {
    mounted = false;
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('popstate', onPop);
  };
}
