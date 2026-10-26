'use client';

// The hooks a screen uses: its slices, the host's navigation, a quiet re-read. Outside the host (a test, the kit) a
// slice is unread unless a SliceFixture pins it, and navigation falls back to the router.
import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useMemo } from 'react';
import { UNREAD } from '../model/entry';
import type { ScreenKey } from '../model/routes';
import type { SliceState } from '../model/wire';
import { hostNavigate, hostReplace, hostRevalidate } from './navigation';
import { useScope } from './scope';
import { useHostSelect } from './store';

/** One slice of the screen this component is in: unread, ok (data, asOf) or error (reason). */
export function useSlice<T>(name: string): SliceState<T> {
  const scope = useScope();
  const key = scope && 'key' in scope ? scope.key : null;
  const live = useHostSelect((s) => (key ? (s.entries[key]?.slices[name] ?? UNREAD) : UNREAD), UNREAD);
  if (scope && 'fixed' in scope) return (scope.fixed[name] ?? UNREAD) as SliceState<T>;
  return live as SliceState<T>;
}

/** The screen's read as a whole: a read in flight (first or quiet), and when the last complete read ended. */
export function useScreenRead(): { reading: boolean; asOf?: string; notFound: boolean } {
  const scope = useScope();
  const key = scope && 'key' in scope ? scope.key : null;
  const entry = useHostSelect((s) => (key ? s.entries[key] : undefined), undefined);
  return useMemo(() => ({ reading: entry?.reading ?? false, asOf: entry?.asOf, notFound: entry?.notFound ?? false }), [entry]);
}

/** Navigate in-app: the host draws a claimed href in place; anything else goes through the router. */
export function useHostNav(): { navigate: (href: string) => void; replace: (href: string) => void } {
  const router = useRouter();
  return useMemo(
    () => ({
      navigate: (href: string) => {
        if (!hostNavigate(href)) startTransition(() => router.push(href));
      },
      replace: (href: string) => {
        if (!hostReplace(href)) startTransition(() => router.replace(href));
      },
    }),
    [router],
  );
}

/**
 * Re-read a screen quietly after a write or on a poll (instead of router.refresh): the kept slices stay until fresh
 * lines replace them. No key: the screen showing. A screen the host does not draw yet refreshes through the router.
 */
export function useRevalidate(): (key?: ScreenKey) => void {
  const router = useRouter();
  const scope = useScope();
  const own = scope && 'key' in scope ? scope.key : undefined;
  return useCallback(
    (key?: ScreenKey) => {
      const k = key ?? own;
      if (k) hostRevalidate(k);
      else router.refresh();
    },
    [own, router],
  );
}
