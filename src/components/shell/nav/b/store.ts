'use client';

// Arm B's host state, one per browser tab: which list screen the host draws (null: the route draws the page), the last
// envelope each visited screen was drawn from, and where each screen was left. Module state behind useSyncExternalStore,
// so a sidebar click swaps the screen in the same task, before Next's own pathname update renders.
import { useSyncExternalStore } from 'react';
import { readScreen, type ScreenEnvelope } from '../screenApi';
import { ARM_SAMPLE_KEYS, type ArmScreenKey } from '../navArm';
import { ARM_B_MARK, listKeyOf, markedPath, pathOf, targetOf, veilsOnActivate } from './model';

export interface Entry<K extends ArmScreenKey = ArmScreenKey> {
  /** The envelope the screen is drawn from; absent until the first read lands (the skeleton shows). */
  env?: ScreenEnvelope<K>;
  /** Needs you on activation: the kept rows are veiled (inert, dimmed) until the fresh read lands. */
  veiled: boolean;
  /** The last read failed (its reason). */
  error?: string;
}

export type Entries = { [K in ArmScreenKey]?: Entry<K> };

export interface HostState {
  /** The list path the host draws, or null when the route's own page shows. */
  active: string | null;
  entries: Entries;
}

const EMPTY: HostState = { active: null, entries: {} };
let state: HostState = EMPTY;
const listeners = new Set<() => void>();
/** Each screen's URL when the viewer left it (fleet's list state lives in its query). */
const lastUrl: Partial<Record<ArmScreenKey, string>> = {};
/** Each screen's in-flight read: a newer one aborts it. */
const inflight = new Map<ArmScreenKey, AbortController>();
/** The props each screen is drawn from, serialised: an identical re-read keeps the old object (no re-render, no reset). */
const lastJson = new Map<ArmScreenKey, string>();

function set(next: HostState): void {
  state = next;
  for (const fn of listeners) fn();
}

function patch<K extends ArmScreenKey>(key: K, entry: Entry<K>): void {
  set({ ...state, entries: { ...state.entries, [key]: entry } });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useHostState(): HostState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** Read a screen's props; drawn kept props stay until the read lands, and stay as they are when it brings nothing new. */
function load<K extends ArmScreenKey>(key: K, search: string): void {
  inflight.get(key)?.abort();
  const ctl = new AbortController();
  inflight.set(key, ctl);
  readScreen(key, search, ctl.signal).then(
    (env) => {
      if (inflight.get(key) === ctl) inflight.delete(key);
      const json = JSON.stringify(env.props);
      const prev = state.entries[key] as Entry<K> | undefined;
      const same = prev?.env !== undefined && lastJson.get(key) === json;
      lastJson.set(key, json);
      patch(key, { env: same ? prev.env : env, veiled: false });
    },
    (e: unknown) => {
      if (ctl.signal.aborted) return;
      inflight.delete(key);
      const prev = state.entries[key] as Entry<K> | undefined;
      patch(key, { ...(prev ?? { veiled: false }), error: e instanceof Error ? e.message : 'no answer' });
    },
  );
}

/** Make `path` the host's screen (null: the route's page). Every activation re-reads the screen; Needs you veils until it lands. */
export function setActive(path: string | null, search: string): void {
  if (path === state.active) return;
  const key = path ? listKeyOf(path) : null;
  if (!path || !key) {
    set({ ...state, active: null });
    return;
  }
  const prev = state.entries[key];
  const entry = prev ? { env: prev.env, veiled: prev.env !== undefined && veilsOnActivate(key) } : { veiled: false };
  set({ active: path, entries: { ...state.entries, [key]: entry } });
  load(key, search);
}

/** Follow the history entry the browser is on: the host's own (marked) entry, or the route's. */
export function syncFromHistory(): void {
  setActive(markedPath(window.history.state, window.location.pathname), window.location.search);
}

/**
 * After every host commit: still on the host's path (Next's pathname agrees), the entry is the host's, so a mark that a
 * refresh or an HMR update wrote away is put back; anywhere else, follow the entry. Next's state carries __NA, so this
 * replaceState skips its router sync.
 */
export function keepOrSync(pathname: string): void {
  const s: unknown = window.history.state;
  const here = window.location.pathname;
  if (state.active === null || state.active !== here || pathname !== here) return syncFromHistory();
  if (markedPath(s, here) === here) return;
  window.history.replaceState({ ...(s && typeof s === 'object' ? s : {}), [ARM_B_MARK]: here }, '', window.location.href);
}

/** A sidebar click on a list screen: push its URL (Next syncs usePathname), draw it here, no router navigation. */
export function navigateTo(href: string): void {
  const hereKey = listKeyOf(window.location.pathname);
  if (hereKey) lastUrl[hereKey] = window.location.pathname + window.location.search;
  const key = listKeyOf(href);
  if (!key) return;
  const target = targetOf(href, lastUrl[key]);
  const path = pathOf(target);
  if (path === window.location.pathname) return; // already on it (the host's copy or the route's page)
  window.history.pushState({ [ARM_B_MARK]: path }, '', target);
  setActive(path, target.slice(path.length).split('#', 1)[0] ?? '');
}

/** A reload keeps history.state: the entry the page was loaded on is the route's, never the host's. */
export function unmarkCurrent(): void {
  const s: unknown = window.history.state;
  if (!s || typeof s !== 'object' || !(ARM_B_MARK in s)) return;
  const rest: Record<string, unknown> = { ...(s as Record<string, unknown>) };
  delete rest[ARM_B_MARK];
  window.history.replaceState(rest, '', window.location.href);
}

/** The host's screens in a fixed order (their Activity boundaries never reorder). */
export const HOST_KEYS = ARM_SAMPLE_KEYS;
