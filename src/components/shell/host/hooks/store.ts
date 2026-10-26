'use client';

// The screen host's state, one per browser tab: where the host is (loc, null when the route's own page shows), the
// visited screens most recent first (LRU, cap 10), each one's last URL and read state. Module state behind
// useSyncExternalStore, so a click swaps the screen in the same task, before Next's own pathname update renders.
// Which keys are claimed and what each declares is configured by ScreenHost (configureHost): this file imports no screen.
import { useSyncExternalStore } from 'react';
import { applyLine, carry, failUnread, freshEntry, visit, VISITED_CAP, type ScreenEntry } from '../model/entry';
import { dropQuery, type Loc } from '../model/loc';
import type { RouteMatch, ScreenKey } from '../model/routes';
import { NOT_LOCAL, screenUrl } from '../model/wire';
import { readStream, ScreenStreamError } from './readStream';

export type { Loc } from '../model/loc';

export interface HostState {
  /** The pathname the host last saw Next render (null before the first effect): see ScreenHost's render rule. */
  seenPath: string | null;
  loc: Loc | null;
  order: readonly ScreenKey[];
  locs: Readonly<Partial<Record<ScreenKey, Loc>>>;
  entries: Readonly<Partial<Record<ScreenKey, ScreenEntry>>>;
}

export interface HostConfig {
  isReady: (key: ScreenKey) => boolean;
  declared: (key: ScreenKey) => readonly string[];
  /** The slices that depend on the key's param (ScreenDef.paramSlices): another param re-reads only these. */
  paramSlices?: (key: ScreenKey) => readonly string[];
  /** A redirect line: replace the URL (the navigation module's replace). */
  redirect: (href: string) => void;
}

export const INITIAL: HostState = Object.freeze({ seenPath: null, loc: null, order: [], locs: {}, entries: {} });
let state: HostState = INITIAL;
let config: HostConfig = { isReady: () => false, declared: () => [], redirect: () => undefined };
const listeners = new Set<() => void>();
const inflight = new Map<ScreenKey, AbortController>();

export function configureHost(c: HostConfig): void {
  config = c;
}

export function hostConfig(): HostConfig {
  return config;
}

function set(next: HostState): void {
  state = next;
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getState = (): HostState => state;
const getServer = (): HostState => INITIAL;

export function useHostState(): HostState {
  return useSyncExternalStore(subscribe, getState, getServer);
}

/** Select from the state; `pick` must return a stable value (an object of the state, a constant) for an unchanged state. */
export function useHostSelect<T>(pick: (s: HostState) => T, server: T): T {
  return useSyncExternalStore(subscribe, () => pick(state), () => server);
}

function setEntry(key: ScreenKey, entry: ScreenEntry): void {
  if (state.entries[key] !== entry) set({ ...state, entries: { ...state.entries, [key]: entry } });
}

function abort(key: ScreenKey): void {
  const ctl = inflight.get(key);
  if (!ctl) return;
  ctl.abort();
  inflight.delete(key);
  const e = state.entries[key];
  if (e?.reading) setEntry(key, { ...e, reading: false });
}

/**
 * Read `key`'s stream for its current loc: kept slices stay until each fresh line replaces them (stale-while-revalidate).
 * `only`: read just those slices (a param change on a screen that keeps the rest). A screen that declares no slice
 * reads nothing (settings, the kit: there is no loader to ask).
 */
export function read(key: ScreenKey, only?: readonly string[]): void {
  const loc = state.locs[key];
  const start = state.entries[key];
  if (!loc || !start) return;
  inflight.get(key)?.abort();
  const all = config.declared(key);
  const declared = only ?? all;
  if (!declared.length) {
    if (start.reading) setEntry(key, { ...start, reading: false });
    return;
  }
  const ctl = new AbortController();
  inflight.set(key, ctl);
  const instance = start.instance;
  const current = (): ScreenEntry | null => {
    const e = state.entries[key];
    return !ctl.signal.aborted && e && e.instance === instance ? e : null;
  };
  setEntry(key, { ...start, reading: true });
  const fail = (reason: string) => {
    const e = current();
    if (e) setEntry(key, failUnread(e, declared, reason));
  };
  const part = only && only.length < all.length ? only : undefined;
  readStream(screenUrl(key, loc.params, loc.search, part), ctl.signal, (line) => {
    const e = current();
    if (!e) return;
    const { entry, effect } = applyLine(e, line, declared);
    setEntry(key, entry);
    if (!effect) return;
    // the query that led here led to the redirect: a link back with no query must not land on it again
    const showing = state.loc?.key === key;
    set({ ...state, locs: dropQuery(state.locs, key), loc: showing && state.loc ? { ...state.loc, search: '' } : state.loc });
    if (showing) config.redirect(effect.redirect);
  })
    .then(
      (ended) => (ended ? undefined : fail('unreadable')),
      (err: unknown) => fail(err instanceof ScreenStreamError && err.status === 403 ? NOT_LOCAL : err instanceof Error && err.name === 'AbortError' ? 'aborted' : 'unreadable'),
    )
    .finally(() => {
      if (inflight.get(key) === ctl) inflight.delete(key);
    });
}

const locOf = (m: RouteMatch): Loc => ({ key: m.key, params: m.params, search: m.search.toString(), path: m.path });

/**
 * Make `m` the host's screen (null, or a key not claimed: the route's page shows). A new instance (another param)
 * starts unread; `reread` (every navigation, back/forward included) re-reads a kept one quietly. Leaving a screen
 * aborts its read; past the cap the least recent screen goes.
 */
export function activate(m: RouteMatch | null, reread: boolean): void {
  const prev = state.loc;
  if (!m || !config.isReady(m.key)) {
    if (prev) abort(prev.key);
    if (state.loc) set({ ...state, loc: null });
    return;
  }
  const loc = locOf(m);
  const kept = state.entries[m.key];
  const fresh = !kept || kept.instance !== loc.path;
  // another param on a screen that keeps its other slices: only the param's own are read again
  const carried = kept && fresh ? carry(kept, loc.path, config.paramSlices?.(m.key) ?? [], config.declared(m.key)) : null;
  const { order, evicted } = visit(state.order, m.key, VISITED_CAP);
  const entries = { ...state.entries, [m.key]: carried ? carried.entry : fresh ? freshEntry(loc.path) : kept };
  const locs = { ...state.locs, [m.key]: loc };
  for (const k of evicted) {
    abort(k);
    delete entries[k];
    delete locs[k];
  }
  if (prev && prev.key !== m.key) abort(prev.key);
  const moved = !prev || prev.key !== loc.key || prev.path !== loc.path;
  set({ ...state, loc, order, entries, locs });
  if (fresh || reread || moved) read(m.key, carried?.only);
}

/** The query a visited screen was left with (read off the URL as it leaves): a link back with no query returns to it. */
export function keepSearch(path: string, search: string): void {
  const loc = state.loc;
  const q = new URLSearchParams(search).toString();
  if (loc && loc.path === path && loc.search !== q) set({ ...state, locs: { ...state.locs, [loc.key]: { ...loc, search: q } } });
}

/** Record the pathname Next rendered (ScreenHost's effect); the render rule trusts the store again from here. */
export function markSeen(pathname: string): void {
  if (state.seenPath !== pathname) set({ ...state, seenPath: pathname });
}

/** Tests only: back to the first state, every read aborted. */
export function resetHostForTests(): void {
  for (const ctl of inflight.values()) ctl.abort();
  inflight.clear();
  state = INITIAL;
}
