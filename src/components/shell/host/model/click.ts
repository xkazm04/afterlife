// Which document clicks the screen host takes. Pure: the store's window listener (capture phase, before React and
// before next/link) reads the event and the anchor into these shapes and asks; everything else stays the browser's or
// the router's. A taken click is preventDefault()ed, which next/link honours (it skips a defaultPrevented click).

export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

export interface AnchorLike {
  /** The href attribute as written (relative or absolute), or null. */
  href: string | null;
  /** The target attribute ('' or '_self' stay in this tab). */
  target: string;
  download: boolean;
  /** The anchor or an ancestor carries data-host-nav="off": the screen handles this link itself. */
  optedOut: boolean;
}

export interface Here {
  origin: string;
  pathname: string;
  search: string;
  href: string;
}

/** A plain primary click, nobody handled it before the capture phase. Modified clicks (new tab, download) are the browser's. */
export function plainClick(e: ClickLike): boolean {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * The in-app href (path + query + hash) a click on `a` goes to, when the host may take it: same origin, this tab, not a
 * download, not opted out, and not a jump within the page (same path and query, a hash). Null: leave the click alone.
 */
export function inAppHref(a: AnchorLike, here: Here): string | null {
  if (a.href === null || a.download || a.optedOut) return null;
  if (a.target !== '' && a.target !== '_self') return null;
  let url: URL;
  try {
    url = new URL(a.href, here.href);
  } catch {
    return null;
  }
  if (url.origin !== here.origin) return null;
  if (url.hash && url.pathname === here.pathname && url.search === here.search) return null;
  return url.pathname + url.search + url.hash;
}
