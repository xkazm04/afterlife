// The screen host's route table: every in-app URL the host can draw, as a ScreenKey and its params. Pure (no React, no
// window), shared by the client host and the server stream (src/app/features/screens): one list, so the two never drift.
// A key names a route pattern ('fleet/[project]'), never one URL; its one param, when it has one, travels in the stream's
// query under the param's own name (project, item, class, stage, id, node).

export const SCREEN_KEYS = [
  'vitals',
  'vitals/[project]',
  'fleet',
  'fleet/[project]',
  'monitor',
  'needs-you',
  'needs-you/[item]',
  'ladder',
  'ladder/[class]',
  'maturity',
  'maturity/[stage]',
  'cycles',
  'task',
  'task/[id]',
  'onboard',
  'onboard/estate',
  'setup',
  'setup/[node]',
  'trace',
  'theater',
  'runs',
  'settings/display',
  'settings/data',
  'settings/keyboard',
  'settings/about',
  'kit',
] as const;

export type ScreenKey = (typeof SCREEN_KEYS)[number];

/** The feature module (src/app/features/<module>) that owns a key: its first segment, every settings page in 'settings'. */
export type ScreenModule =
  | 'vitals' | 'fleet' | 'monitor' | 'needs-you' | 'ladder' | 'maturity' | 'cycles' | 'task'
  | 'onboard' | 'setup' | 'trace' | 'theater' | 'runs' | 'settings' | 'kit';

export function moduleOf(key: ScreenKey): ScreenModule {
  return key.split('/', 1)[0] as ScreenModule;
}

/** The name of a key's one param ('fleet/[project]' -> 'project'), or null for a key without one. */
export function paramOf(key: ScreenKey): string | null {
  return /\/\[(\w+)\]$/.exec(key)?.[1] ?? null;
}

/** Every param name a key can carry: the stream's query reserves these for the key's param. */
export const PARAM_NAMES: readonly string[] = [...new Set(SCREEN_KEYS.map(paramOf).filter((p): p is string => p !== null))];

export function isScreenKey(v: string): v is ScreenKey {
  return (SCREEN_KEYS as readonly string[]).includes(v);
}

/** Where the host is: a key, its params (decoded), and the URL's query. */
export interface RouteMatch {
  key: ScreenKey;
  params: Readonly<Record<string, string>>;
  search: URLSearchParams;
  /** The pathname as matched (no trailing slash): the screen instance's identity with the key. */
  path: string;
}

function decode(seg: string): string | null {
  try {
    return decodeURIComponent(seg);
  } catch {
    return null; // a malformed escape is no route of the host's: the router answers it
  }
}

/**
 * The key a pathname lands on, or null for a URL the host does not draw ('/', '/about', '/settings', '/fleet/a/b').
 * A static key wins over a param key at the same depth ('/onboard/estate' is never a param). `search` is a
 * location.search (with or without '?') or URLSearchParams; the match gets its own copy.
 */
export function matchRoute(pathname: string, search: string | URLSearchParams = ''): RouteMatch | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const segs = path.split('/').slice(1);
  if (segs.length < 1 || segs.length > 2 || segs.some((s) => s === '')) return null;
  const q = new URLSearchParams(search);
  const exact = SCREEN_KEYS.find((k) => k === segs.join('/'));
  if (exact) return { key: exact, params: {}, search: q, path };
  if (segs.length !== 2) return null;
  const key = SCREEN_KEYS.find((k) => paramOf(k) !== null && k.startsWith(`${segs[0]}/[`));
  const name = key ? paramOf(key) : null;
  const value = decode(segs[1] ?? '');
  if (!key || !name || value === null) return null;
  return { key, params: { [name]: value }, search: q, path };
}

/** The pathname for a key and its params ('fleet/[project]', {project:'p 1'} -> '/fleet/p%201'), or null when one is missing. */
export function pathFor(key: ScreenKey, params: Readonly<Record<string, string>> = {}): string | null {
  const name = paramOf(key);
  if (!name) return `/${key}`;
  const v = params[name];
  return v ? `/${key.slice(0, key.indexOf('/['))}/${encodeURIComponent(v)}` : null;
}
