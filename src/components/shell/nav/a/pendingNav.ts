'use client';

// Arm A's pending navigation: set on the click (useDevWarm's delegated listener), read by PendingSkeleton, which paints
// the target's skeleton over the old screen in the click's own frame and steps aside once the route commits. `next dev`
// never prefetches (next/dist/client/components/app-router-utils.js createPrefetchURL returns null in development), so
// without this the old screen stays up, unchanged, for the whole server round trip.
import { useSyncExternalStore } from 'react';

export interface PendingNav {
  /** The pathname the click left. */
  from: string;
  /** The pathname it goes to. */
  to: string;
}

/** A navigation that never commits (an error, a redirect elsewhere) stops showing its skeleton after this long. */
export const PENDING_MAX_MS = 15_000;

let current: PendingNav | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function setPendingNav(next: PendingNav | null): void {
  if (current === next || (current && next && current.from === next.from && current.to === next.to)) return;
  current = next;
  clearTimeout(timer);
  if (next) timer = setTimeout(() => setPendingNav(null), PENDING_MAX_MS);
  emit();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePendingNav(): PendingNav | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
