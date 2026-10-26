// The guide's state, one per page life: on or off, and where the playback is. Two facts are kept per browser in
// localStorage: that the invitation to take it was skipped, and that it was watched to the end (the sidebar's first run
// ends then, and the invitation is not shown again). It never opens by itself. An external store read with useSyncExternalStore, so the layer, the sidebar and the keys share it.
import { useSyncExternalStore } from 'react';
import { GUIDE_DONE_KEY, GUIDE_SKIP_KEY } from './keys';
import { playback, startPlayback, type Playback, type PlaybackEvent } from './playback';
import { STEPS } from './steps';

export interface GuideState extends Playback {
  on: boolean;
  /** Watched to the recap once in this browser. */
  done: boolean;
  /** The invitation was skipped in this browser. */
  skipped: boolean;
  /** Counts the openings, so a step entered again in a new run is set up again. */
  run: number;
}

const SERVER: GuideState = { on: false, i: 0, playing: false, done: false, skipped: false, run: 0 };
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
  const s = storage();
  try {
    state = { ...state, done: !!s?.getItem(GUIDE_DONE_KEY), skipped: !!s?.getItem(GUIDE_SKIP_KEY) };
  } catch {
    // a store that refuses reads: nothing remembered, the invitation shows
  }
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
  /** The invitation's Skip: it is not offered again in this browser (the sidebar and Shift+G still open the guide). */
  skip(): void {
    set({ skipped: true });
    try {
      storage()?.setItem(GUIDE_SKIP_KEY, new Date().toISOString());
    } catch {
      // a full or refused store: skipped holds for this page life only
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
