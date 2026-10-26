// The shell's client sync as pure steps. The root layout renders the shell's numbers once (a layout does not re-render on
// navigation; a server action's refresh() re-renders it with a fresh read), so the client re-reads /api/shell on regained
// focus, when the screen host shows or re-reads a screen (debounced, hostNav.ts: the host swaps screens without the
// router, so nothing else would), and when a screen asks (requestShellRead: a setting the shell draws changed). Requests are
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

/**
 * Why the client might re-read: the window regaining focus, the host showing or re-reading a screen (`nav`), or a screen
 * asking after a change the shell draws (`ask`). A router route change is not one.
 */
export type SyncTrigger = { kind: 'focus' } | { kind: 'nav' } | { kind: 'ask' };

/** The window event a screen dispatches to have the shell read again (requestShellRead). */
export const SHELL_READ_EVENT = 'afterlife:shell-read';

/** Ask the shell to read /api/shell again now (a cookie it draws from changed, Trace saw the live source come up). */
export function requestShellRead(): void {
  window.dispatchEvent(new Event(SHELL_READ_EVENT));
}

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

/**
 * Focus and a host navigation read again when no read is in flight (one at a time is enough). An ask always reads: what it
 * follows changed after the read in flight began, and the newest answer wins.
 */
export function shouldSync(s: SyncState, t: SyncTrigger): boolean {
  return t.kind === 'ask' || s.inFlight === null;
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
