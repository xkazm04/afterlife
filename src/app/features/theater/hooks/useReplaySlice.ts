'use client';

import { useRef, useSyncExternalStore } from 'react';
import type { ReplayStore } from '../model/replay/store';
import type { ReplayState } from '../model/replay/state';

/**
 * Subscribe to a slice of the replay state. The slice is cached: while `eq` says it did not change, React gets the
 * same reference back and skips the render, so only what reads the film position re-renders every frame.
 */
export function useReplaySlice<T>(store: ReplayStore, select: (s: ReplayState) => T, eq: (a: T, b: T) => boolean = Object.is): T {
  const cache = useRef<{ state: ReplayState; value: T } | null>(null);
  const read = (): T => {
    const state = store.get();
    const hit = cache.current;
    if (hit && hit.state === state) return hit.value;
    const value = select(state);
    const keep = hit && eq(hit.value, value) ? hit.value : value;
    cache.current = { state, value: keep };
    return keep;
  };
  return useSyncExternalStore(store.subscribe, read, read);
}
