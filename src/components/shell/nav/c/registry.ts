'use client';

// Arm C's registry: the last-known props of each sample screen (read from /api/screen) and which copy is active. A module
// store, so the sidebar links (the click) and the host (the copies) share it and a click repaints in the same frame: an
// external-store update from a discrete event renders synchronously.
import { useSyncExternalStore } from 'react';
import type { ScreenProps } from '@/app/features/shell-arms/data/screenProps';
import { ARM_SAMPLE_KEYS, type ArmScreenKey } from '../navArm';
import { readScreen } from '../screenApi';
import { activationRefreshDue, quietRefreshDue, staleAtStart, type CopyView } from './model/registryRules';

export interface Entry<K extends ArmScreenKey = ArmScreenKey> extends CopyView {
  props?: ScreenProps[K];
  /** When the server read the props (ISO). */
  asOf?: string;
}

export interface RegistryState {
  active: ArmScreenKey | null;
  /** Counts activations, so a handover is judged per visit. */
  epoch: number;
  entries: { [K in ArmScreenKey]: Entry<K> };
}

const empty = (): Entry => ({ hasProps: false, failed: false, loading: false, fetchedAt: null, stale: false });
const INITIAL: RegistryState = {
  active: null,
  epoch: 0,
  entries: Object.fromEntries(ARM_SAMPLE_KEYS.map((k) => [k, empty()])) as RegistryState['entries'],
};

let state = INITIAL;
const listeners = new Set<() => void>();
const inflight = new Map<ArmScreenKey, Promise<void>>();

function set(next: RegistryState): void {
  state = next;
  for (const fn of listeners) fn();
}

function patch(key: ArmScreenKey, p: Partial<Entry>): void {
  set({ ...state, entries: { ...state.entries, [key]: { ...state.entries[key], ...p } } });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getRegistry(): RegistryState {
  return state;
}

export function useRegistry(): RegistryState {
  return useSyncExternalStore(subscribe, getRegistry, () => INITIAL);
}

/** Make `key`'s copy the active one (null: the route's children). */
export function activate(key: ArmScreenKey | null): void {
  if (state.active === key) return;
  set({ ...state, active: key, epoch: key ? state.epoch + 1 : state.epoch });
}

/**
 * Read `key`'s props again; one read per screen at a time (a call while one runs joins it). Fleet keeps the list state
 * its copy started from: its live list state is the copy's own (and the URL's), never reset by a refresh.
 */
export function refresh(key: ArmScreenKey, search = ''): Promise<void> {
  const running = inflight.get(key);
  if (running) return running;
  patch(key, { loading: true, failed: false, stale: staleAtStart(key, state.entries[key].fetchedAt, Date.now()) });
  const p = readScreen(key, search)
    .then(
      (env) => {
        const prev = state.entries[key].props;
        const props = key === 'fleet' && prev ? { ...env.props, start: (prev as ScreenProps['fleet']).start } : env.props;
        patch(key, { props, asOf: env.asOf, hasProps: true, fetchedAt: Date.now(), loading: false, failed: false, stale: false });
      },
      () => patch(key, { loading: false, failed: true }),
    )
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Show `key`'s copy now (last-known props, or its skeleton) and refetch it when due (Needs you: always). */
export function openCopy(key: ArmScreenKey, href?: string): void {
  activate(key);
  if (activationRefreshDue(key, state.entries[key].fetchedAt, Date.now())) void refresh(key, searchFor(key, href));
}

/** Read `key` again unless a read landed in the last few seconds (a route landing, an RSC refresh). */
export function quietRefresh(key: ArmScreenKey): void {
  if (quietRefreshDue(state.entries[key].fetchedAt, Date.now())) void refresh(key, searchFor(key));
}

/** The query a read of `key` passes: fleet's list state from the URL when the browser is on /fleet, else none. */
export function searchFor(key: ArmScreenKey, href?: string): string {
  if (key !== 'fleet') return '';
  const q = href?.split('?')[1]?.split('#')[0];
  if (q !== undefined) return q;
  return window.location.pathname === '/fleet' ? window.location.search : '';
}
