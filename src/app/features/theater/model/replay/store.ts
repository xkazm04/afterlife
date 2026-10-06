// A tiny external store around the reducer. The film clock ticks 60 times a second; only the parts of the
// screen that read the film position (the wall) subscribe to every frame, the rest read discrete slices.
import { reduce, type Action } from './reducer';
import { initialState, type ReplayState } from './state';

export interface ReplayStore {
  get: () => ReplayState;
  dispatch: (a: Action) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createReplayStore(initial: ReplayState = initialState()): ReplayStore {
  let state = initial;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    dispatch: (a) => {
      const next = reduce(state, a);
      if (next === state) return;
      state = next;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

export function shallowEqual<T extends object>(a: T, b: T): boolean {
  const ka = Object.keys(a) as (keyof T)[];
  return ka.length === Object.keys(b).length && ka.every((k) => Object.is(a[k], b[k]));
}
