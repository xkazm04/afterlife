'use client';

// The palette's projects, read apart from the shell: GET /api/shell/projects on the palette's first open, and again on
// regained focus at most once a minute once it has been read. Kept in one client store for the page's life, so a reopen
// shows the list at once. Absent-value contract: before the first answer the list is [] and the state is 'loading' (the
// palette says "Loading projects..."), never an empty fleet.
import { useEffect, useSyncExternalStore } from 'react';
import type { ProjectRef } from './model/items';

export const PROJECTS_URL = '/api/shell/projects';
/** A regained focus re-reads only when the last read is at least this old. */
export const FOCUS_REREAD_MS = 60_000;

export interface ProjectsState {
  status: 'loading' | 'ready' | 'failed';
  /** [] until the first answer; a later failed read keeps the last list. */
  projects: readonly ProjectRef[];
}

interface Store extends ProjectsState {
  /** When the last read was issued (ms), or null: never. */
  readAt: number | null;
  inFlight: boolean;
}

const INITIAL: Store = { status: 'loading', projects: [], readAt: null, inFlight: false };
let store: Store = INITIAL;
const subs = new Set<() => void>();
const set = (next: Partial<Store>) => {
  store = { ...store, ...next };
  subs.forEach((f) => f());
};

const isRef = (v: unknown): v is ProjectRef => {
  const o = v as ProjectRef | null;
  return typeof o?.id === 'string' && typeof o.name === 'string' && typeof o.group === 'string' && typeof o.state === 'string';
};

/** The list in a 200 answer, or null for a refused fetch, a non-200 (503 before the first poll) or a bad body. */
export async function readProjects(): Promise<ProjectRef[] | null> {
  try {
    const res = await fetch(PROJECTS_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { projects?: unknown } | null;
    return Array.isArray(body?.projects) && body.projects.every(isRef) ? body.projects : null;
  } catch {
    return null;
  }
}

/** One read, unless one is in flight. A failed read before any list says 'failed'; after one it keeps the list. */
export async function loadProjects(now: number = Date.now()): Promise<void> {
  if (store.inFlight) return;
  set({ inFlight: true, readAt: now, status: store.status === 'ready' ? 'ready' : 'loading' });
  const projects = await readProjects();
  if (projects) set({ inFlight: false, status: 'ready', projects });
  else set({ inFlight: false, status: store.status === 'ready' ? 'ready' : 'failed' });
}

/** Regained focus: re-read only a list the palette has read before, and at most once a minute. */
export function focusDue(now: number): boolean {
  return store.readAt !== null && !store.inFlight && now - store.readAt >= FOCUS_REREAD_MS;
}

/** The store's current state (tests). */
export const projectsState = (): ProjectsState => store;
/** Back to never read (tests). */
export const resetProjects = () => set(INITIAL);

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
const snapshot = () => store;
const serverSnapshot = () => INITIAL;

/** The palette's projects: read when `open` turns true and nothing is read yet (or the last read failed). */
export function usePaletteProjects(open: boolean): ProjectsState {
  const s = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => {
    if (open && store.status !== 'ready') void loadProjects();
  }, [open]);
  useEffect(() => {
    const onFocus = () => {
      if (focusDue(Date.now())) void loadProjects();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  return s;
}
