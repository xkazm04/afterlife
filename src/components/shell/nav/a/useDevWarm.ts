'use client';

// Arm A's dev effects. `next dev` never prefetches: createPrefetchURL returns null in development
// (next/dist/client/components/app-router-utils.js), so router.prefetch and <Link prefetch> do nothing there and every
// first click waits for Turbopack to compile the module. So on an idle frame after the page loads, the warm pass GETs each
// sample route once (its answer is thrown away: the request only makes `next dev` build the route), and a click the router
// takes is marked pending so PendingSkeleton paints the target's skeleton at once. Dev only: production prefetches visible
// links itself. Everything here stops when the arm changes (the host unmounts and the cleanups run).
import { useEffect } from 'react';
import { setPendingNav } from './pendingNav';
import { IDLE_TIMEOUT_MS, pendingTarget, WARM_COMPILE, WARM_ROUTES } from './warmPlan';

const DEV = process.env.NODE_ENV === 'development';

let warmed = false; // once per page load: a compiled route stays compiled until its code changes

function onIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 1);
  return () => window.clearTimeout(id);
}

async function compileAll(signal: AbortSignal): Promise<void> {
  const here = window.location.pathname;
  for (const path of [...WARM_ROUTES, ...WARM_COMPILE]) {
    if (path === here) continue;
    if (signal.aborted) return;
    try {
      // one at a time, so the warm pass never competes with the screen's own stream for more than one render
      const res = await fetch(path, { cache: 'no-store', signal, headers: { 'x-belay-warm': '1' } });
      await res.body?.cancel(); // compiled once the headers are back; the page itself is not needed
    } catch {
      return; // aborted (the arm changed) or the server is gone: nothing to warm
    }
  }
  if (!signal.aborted) warmed = true;
}

/** Compile the sample modules and their detail routes on the first idle frame (once per page load). */
export function useDevWarm(): void {
  useEffect(() => {
    if (!DEV || warmed) return;
    const ac = new AbortController();
    const cancel = onIdle(() => void compileAll(ac.signal));
    return () => {
      cancel();
      ac.abort();
    };
  }, []);
}

/**
 * Mark a click the router took to another sample path as pending (PendingSkeleton paints the target's skeleton). The
 * listener sits on the document after React's own (registered at hydration), so a <Link>'s preventDefault is visible.
 */
export function useClickPending(): void {
  useEffect(() => {
    if (!DEV) return;
    const onClick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!a || (a.getAttribute('target') ?? '_self') !== '_self') return;
      const click = { button: e.button, defaultPrevented: e.defaultPrevented, modified: e.metaKey || e.ctrlKey || e.shiftKey || e.altKey };
      const from = window.location.pathname;
      const to = pendingTarget(click, a.getAttribute('href'), window.location.origin, from);
      if (to) setPendingNav({ from, to });
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      setPendingNav(null);
    };
  }, []);
}
