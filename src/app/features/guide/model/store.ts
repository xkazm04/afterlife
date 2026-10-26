// The guide's state, one per page life: on or off, and where the playback is. Two facts are kept per browser in
// localStorage: that the first demo visit has opened it, and that it was watched to the end (the sidebar's first run
// ends then). An external store read with useSyncExternalStore, so the layer, the sidebar and the keys share it.
import { useSyncExternalStore } from 'react';
import { GUIDE_DONE_KEY, GUIDE_FIRST_KEY } from './keys';
import { playback, startPlayback, type Playback, type PlaybackEvent } from './playback';
import { STEPS } from './steps';

export interface GuideState extends Playback {
  on: boolean;
  /** Watched to the recap once in this browser. */
  done: boolean;
  /** Counts the openings, so a step entered again in a new run is set up again. */
  run: number;
}

const SERVER: GuideState = { on: false, i: 0, playing: false, done: false, run: 0 };
let state: GuideState = SERVER;
let loaded = false;
const subs = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null; // storage refused (a locked-down profile): the guide still plays, it just forgets
  }
}

function load(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  state = { ...state, done: !!storage()?.getItem(GUIDE_DONE_KEY) };
}

function set(next: Partial<GuideState>): void {
  load();
  state = { ...state, ...next };
  if (state.on && state.i === STEPS.length - 1 && !state.done) {
    state = { ...state, done: true };
    try {
      storage()?.setItem(GUIDE_DONE_KEY, new Date().toISOString());
    } catch {
      // a full or refused store: done holds for this page life only
    }
  }
  for (const f of subs) f();
}

const reduced = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const guideStore = {
  subscribe(f: () => void): () => void {
    subs.add(f);
    return () => subs.delete(f);
  },
  get(): GuideState {
    load();
    return state;
  },
  /** Open the guide at a step (the start by default), playing unless motion is reduced. */
  open(at = 0): void {
    set({ on: true, run: state.run + 1, ...startPlayback(reduced(), at) });
  },
  close(): void {
    if (state.on) set({ on: false, playing: false });
  },
  send(e: PlaybackEvent): void {
    const { i, playing } = playback(state, e);
    if (i !== state.i || playing !== state.playing) set({ i, playing });
  },
  /** True once per browser: the first call reads and sets the flag. A store that refuses either is never a first visit. */
  takeFirstVisit(): boolean {
    try {
      const s = storage();
      if (!s || s.getItem(GUIDE_FIRST_KEY)) return false;
      s.setItem(GUIDE_FIRST_KEY, new Date().toISOString());
      return true;
    } catch {
      return false; // it could not be remembered, so opening it would repeat on every load
    }
  },
};

/** What a step entry is keyed by: the run and the step, so stepping back and reopening both set the screen up again. */
export const entryOf = (s: GuideState): string => `${s.run}:${s.i}`;

export function useGuide(): GuideState {
  return useSyncExternalStore(guideStore.subscribe, guideStore.get, () => SERVER);
}

/** Anything in the app can ask for the guide (the help popover does): one window event, no import of this module. */
export const GUIDE_EVENT = 'afterlife:guide';
