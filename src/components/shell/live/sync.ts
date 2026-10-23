// The shell's client sync as pure steps. The root layout renders the shell's numbers once (a layout does not re-render on
// navigation), so the client re-reads them from /api/shell on a route change and on regained focus. Requests are
// numbered: the newest answer wins, a late answer to an older request is dropped, and a new server prop (the layout
// re-rendered by refresh()) is adopted at once and voids every request issued before it. A failed read changes nothing.
import type { ShellInfo } from '../ShellContext';

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

/** Why the client might re-read: a route change (from null on the first render) or the window regaining focus. */
export type SyncTrigger = { kind: 'nav'; from: string | null; to: string } | { kind: 'focus' };

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

/** The first render needs no read (the server prop is fresh), the same route none, and one read at a time is enough. */
export function shouldSync(s: SyncState, t: SyncTrigger): boolean {
  if (s.inFlight !== null) return false;
  return t.kind === 'focus' || (t.from !== null && t.from !== t.to);
}

const isShellInfo = (v: unknown): v is ShellInfo => {
  const o = v as ShellInfo | null;
  return typeof o?.needsYouCount === 'number' && typeof o.data?.mode === 'string' && typeof o.data.group === 'string' && Array.isArray(o.projects);
};

/** One read of /api/shell: the shell info, or null for a refused fetch, a non-200 (503 before the first poll) or a bad body. */
export async function readAnswer(signal?: AbortSignal): Promise<ShellInfo | null> {
  try {
    const res = await fetch(SHELL_URL, { cache: 'no-store', signal });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    return isShellInfo(body) ? body : null;
  } catch {
    return null;
  }
}
