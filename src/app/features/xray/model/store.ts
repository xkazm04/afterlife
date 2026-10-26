// The X-ray's state, one per page life: on or off, and the part shown on each screen. An external store, read with
// useSyncExternalStore, so the toggle, the sidebar, the panel and the keys share it without a provider. First run is the
// guide's (features/guide): the X-ray opens only when asked.
import { useSyncExternalStore } from 'react';

export interface XrayState {
  on: boolean;
  /** The part shown, and the path it was picked on: another screen starts at its first part. */
  step: number;
  stepPath: string;
}

const SERVER: XrayState = { on: false, step: 0, stepPath: '' };
let state: XrayState = SERVER;
const subs = new Set<() => void>();

function set(next: Partial<XrayState>): void {
  state = { ...state, ...next };
  for (const f of subs) f();
}

export const xrayStore = {
  subscribe(f: () => void): () => void {
    subs.add(f);
    return () => subs.delete(f);
  },
  get(): XrayState {
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
};

export function useXray(): XrayState {
  return useSyncExternalStore(xrayStore.subscribe, xrayStore.get, () => SERVER);
}

/** The part shown on `path`: the one picked there, else the first. */
export const stepOn = (s: XrayState, path: string): number => (s.stepPath === path ? s.step : 0);

/** Anything in the app can ask for the X-ray (the help popover does): one window event, no import of this module. */
export const XRAY_EVENT = 'afterlife:xray';
