// When the shell re-reads because of the screen host: the host swaps screens with pushState and re-reads them quietly
// (a return, a poll, a write's revalidate), and none of that re-renders the root layout, so the Needs-you badge and the
// poll line would stay as the first screen left them. Each time the host shows another screen or starts a read of the
// one showing, the shell reads once, debounced: a burst of switches is one read.
import { getState, subscribe, type HostState } from '../host/hooks/store';

export const HOST_NAV_DEBOUNCE_MS = 300;

/** What makes a shell read due: the screen showing (its path) and whether its read is in flight. */
export interface HostMark {
  path: string | null;
  reading: boolean;
}

export function markOf(s: HostState): HostMark {
  const loc = s.loc;
  return { path: loc ? loc.path : null, reading: loc ? s.entries[loc.key]?.reading === true : false };
}

/** Pure: another screen showing, or a read of the one showing just began. Leaving the host (path null) is not one. */
export function navDue(prev: HostMark, next: HostMark): boolean {
  if (next.path === null) return false;
  return next.path !== prev.path || (next.reading && !prev.reading);
}

/** Calls `read` (debounced) whenever navDue says so; returns the unsubscribe. */
export function onHostNav(read: () => void, wait = HOST_NAV_DEBOUNCE_MS): () => void {
  let prev = markOf(getState());
  let timer: ReturnType<typeof setTimeout> | null = null;
  const off = subscribe(() => {
    const next = markOf(getState());
    const due = navDue(prev, next);
    prev = next;
    if (!due) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      read();
    }, wait);
  });
  return () => {
    off();
    if (timer) clearTimeout(timer);
  };
}
