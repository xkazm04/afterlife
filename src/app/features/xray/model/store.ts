// The X-ray's state, one per page life: on or off, the part shown on each screen, and the screens seen (kept per browser
// in localStorage, as the first-visit flag is). An external store, read with useSyncExternalStore, so the toggle, the
// sidebar, the panel and the keys share it without a provider.
import { useSyncExternalStore } from 'react';
import { XRAY_FIRST_KEY, XRAY_SEEN_KEY } from './keys';

export interface XrayState {
  on: boolean;
  /** The part shown, and the path it was picked on: another screen starts at its first part. */
  step: number;
  stepPath: string;
  seen: readonly string[];
}

const SERVER: XrayState = { on: false, step: 0, stepPath: '', seen: [] };
let state: XrayState = SERVER;
let loaded = false;
const subs = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null; // storage refused (a locked-down profile): the X-ray still works, it just forgets
  }
}

function load(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const seen: unknown = JSON.parse(storage()?.getItem(XRAY_SEEN_KEY) ?? '[]');
    if (Array.isArray(seen)) state = { ...state, seen: seen.filter((s): s is string => typeof s === 'string') };
  } catch {
    // a corrupt entry is read as nothing seen
  }
}

function set(next: Partial<XrayState>): void {
  load();
  state = { ...state, ...next };
  for (const f of subs) f();
}

export const xrayStore = {
  subscribe(f: () => void): () => void {
    subs.add(f);
    return () => subs.delete(f);
  },
  get(): XrayState {
    load();
    return state;
  },
  setOn(on: boolean): void {
    if (state.on !== on) set({ on });
  },
  toggle(): void {
    set({ on: !state.on });
  },
  setStep(path: string, step: number): void {
    set({ step, stepPath: path, on: true });
  },
  markSeen(key: string): void {
    load();
    if (state.seen.includes(key)) return;
    set({ seen: [...state.seen, key] });
    storage()?.setItem(XRAY_SEEN_KEY, JSON.stringify(state.seen));
  },
  /** True once per browser: the first call reads and sets the flag. */
  takeFirstVisit(): boolean {
    const s = storage();
    if (!s || s.getItem(XRAY_FIRST_KEY)) return false;
    s.setItem(XRAY_FIRST_KEY, new Date().toISOString());
    return true;
  },
};

export function useXray(): XrayState {
  return useSyncExternalStore(xrayStore.subscribe, xrayStore.get, () => SERVER);
}

/** The part shown on `path`: the one picked there, else the first. */
export const stepOn = (s: XrayState, path: string): number => (s.stepPath === path ? s.step : 0);

/** Anything in the app can ask for the X-ray (the help popover does): one window event, no import of this module. */
export const XRAY_EVENT = 'afterlife:xray';
