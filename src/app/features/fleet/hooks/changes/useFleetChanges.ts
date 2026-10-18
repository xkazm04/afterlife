'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { browserStore, decodeBaseline, readRaw, saveBaseline, seen, type Baseline, type BaselineStore } from '../../model/changes/baseline';
import { changesFrom } from '../../model/changes/diff';

// Mark seen in this tab tells the hook to read the store again; another tab's look arrives as a storage event.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener('storage', l);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', l);
  };
};

/**
 * What moved since the viewer's last look: the baseline is read after mount (the server and the first client render
 * have none, so they agree: no marks), and every fresh snapshot is diffed against it. A first visit takes this look as
 * the baseline. `markSeen` makes the current projects the baseline. `initial` replaces the stored baseline (a test seam).
 */
export function useFleetChanges(projects: readonly FleetProject[], initial?: Baseline | null, store: BaselineStore = browserStore) {
  const raw = useSyncExternalStore(
    subscribe,
    () => (initial === undefined ? readRaw(store) : null),
    () => null,
  );
  const base = useMemo(() => (initial !== undefined ? initial : decodeBaseline(raw)), [initial, raw]);
  const out = useMemo(() => changesFrom(base, projects), [base, projects]);

  useEffect(() => {
    if (initial === undefined && readRaw(store) === null) saveBaseline(store, seen(projects, Date.now()));
    // a first visit only: later snapshots are diffed, never taken as the baseline by themselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markSeen = useCallback(() => {
    if (saveBaseline(store, seen(projects, Date.now()))) notify();
  }, [projects, store]);

  return { ...out, markSeen };
}
