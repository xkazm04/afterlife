// Where a screen is (its Loc) and the rules about its query as the host moves between screens. Pure: the store and the
// navigation module ask; nothing here reads window. A screen's query is its own state (fleet's filters, cycles' scope):
// the host keeps the query a screen was left with, gives it back to a link with no query of its own, and drops it when
// the screen redirected (the query was the redirect's cause) or when a bare link names the screen that is showing.
import type { ScreenKey } from './routes';

/** A screen's place: its key, params, raw query (no '?') and matched path (the instance). */
export interface Loc {
  key: ScreenKey;
  params: Readonly<Record<string, string>>;
  search: string;
  path: string;
}

const trim = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const bare = (search: string) => new URLSearchParams(search).toString();

/**
 * The query a screen gets when Next renders a pathname the host has not seen yet (a hard load, Back across a router
 * navigation): the showing screen's own when it is that path; else the address bar's, when it is already there (Back);
 * else the query the screen was left with; else none. `here` is null while hydrating (the server drew no query).
 */
export function arrivalSearch(path: string, here: { pathname: string; search: string } | null, current: Loc | null, kept: Loc | undefined): string {
  if (current?.path === path) return current.search;
  if (here && trim(here.pathname) === path) return bare(here.search);
  return kept?.path === path ? kept.search : '';
}

/**
 * Where a link goes. A link with a query of its own goes there. A bare link to the screen that is showing goes to the
 * bare screen (it clears the screen's query: cycles' project scope, fleet's reset). A bare link to a screen left
 * earlier returns to the query it was left with.
 */
export function linkTarget(url: { pathname: string; search: string; hash: string }, path: string | null, kept: Loc | undefined, showing: string | null): string {
  const as = url.pathname + url.search + url.hash;
  if (url.search || path === null || path === showing || !kept || kept.path !== path || !kept.search) return as;
  return `${url.pathname}?${kept.search}${url.hash}`;
}

/** The locs after a screen redirected: its kept query goes (a link back must not land on the redirect again). */
export function dropQuery<T extends Partial<Record<ScreenKey, Loc>>>(locs: T, key: ScreenKey): T {
  const l = locs[key];
  return l?.search ? { ...locs, [key]: { ...l, search: '' } } : locs;
}
