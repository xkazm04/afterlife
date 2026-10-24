// The shell's client sync as pure steps. The root layout renders the shell's numbers once (a layout does not re-render on
// navigation; a server action's refresh() re-renders it with a fresh read), so the client re-reads /api/shell only on
// regained focus - never per route change: a navigation changes no number the shell shows. Requests are
// numbered: the newest answer wins, a late answer to an older request is dropped, and a new server prop (the layout
// re-rendered by refresh()) is adopted at once and voids every request issued before it. A failed read changes nothing.
import type { KnownShellInfo, ShellInfo } from '../ShellContext';

export interface SyncState {
  /** What the chrome shows. */
  info: ShellInfo;
  /** The server prop this state last adopted. */
  prop: ShellInfo;
  /** The number of the last request issued (requests count from 1). */
  next: number;
  /** Answers to requests numbered up to here are dropped: one was applied, or a server prop came after them. */
  done: number;
  /** The request being read, or null. */
  inFlight: number | null;
}

export type SyncAction =
  | { type: 'issue' }
  | { type: 'answer'; id: number; info: ShellInfo | null }
  | { type: 'server'; info: ShellInfo };

/** Why the client might re-read: the window regaining focus (the only trigger; a route change is not one). */
export type SyncTrigger = { kind: 'focus' };

export const SHELL_URL = '/api/shell';

export function initSync(info: ShellInfo): SyncState {
  return { info, prop: info, next: 0, done: 0, inFlight: null };
}

export function syncReducer(s: SyncState, a: SyncAction): SyncState {
  switch (a.type) {
    case 'issue':
      return { ...s, next: s.next + 1, inFlight: s.next + 1 };
    case 'answer': {
      const inFlight = s.inFlight === a.id ? null : s.inFlight;
      if (!a.info || a.id <= s.done) return inFlight === s.inFlight ? s : { ...s, inFlight };
      return { ...s, info: a.info, done: a.id, inFlight };
    }
    case 'server':
      return { info: a.info, prop: a.info, next: s.next, done: s.next, inFlight: null };
  }
}

/** Regained focus reads again; one read at a time is enough. */
export function shouldSync(s: SyncState, t: SyncTrigger): boolean {
  return s.inFlight === null && t.kind === 'focus';
}

const isShellInfo = (v: unknown): v is KnownShellInfo => {
  const o = v as KnownShellInfo | null;
  return typeof o?.needsYouCount === 'number' && typeof o.data?.mode === 'string' && typeof o.data.group === 'string';
};

/** One read of /api/shell: the shell info, or null for a refused fetch, a non-200 (503 before the first poll) or a bad body. */
export async function readAnswer(signal?: AbortSignal): Promise<KnownShellInfo | null> {
  try {
    const res = await fetch(SHELL_URL, { cache: 'no-store', signal });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    return isShellInfo(body) ? body : null;
  } catch {
    return null;
  }
}
