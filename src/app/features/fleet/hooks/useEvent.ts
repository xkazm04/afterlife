'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A callback with a stable identity that always runs the latest function you passed. The table rows are memoised,
 * so the handlers they receive must not change when the screen's state does.
 */
export function useEvent<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
