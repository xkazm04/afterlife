'use client';

// What moves arm C's registry besides a sidebar click: the router's pathname (any navigation, the route landing), the
// browser's back/forward (popstate, before the router renders), a fresh RSC payload (the layout's children change) and
// an idle warm-up that reads every sample screen once, so a first click already has content to reveal.
import { useEffect, useRef, type ReactNode } from 'react';
import { ARM_SAMPLE_KEYS } from '../navArm';
import { afterPathname, HANDOVER, intentTarget } from './model/registryRules';
import { activate, getRegistry, openCopy, quietRefresh, refresh, searchFor } from './registry';

function idle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 3_000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 1_000);
  return () => window.clearTimeout(id);
}

export function useRouteSignals(pathname: string, children: ReactNode, landed: boolean): void {
  const lastPath = useRef<string | null>(null);

  // the router's pathname: keep, swap or drop the copy; a copy whose route just landed is refreshed quietly
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const reg = getRegistry();
    const next = afterPathname(reg.active, pathname, (k) => reg.entries[k].hasProps);
    activate(next);
    if (next) quietRefresh(next);
  }, [pathname]);

  // back/forward: reveal the copy in the same frame as the history move; the router follows with the real route.
  // Needs you is left to the router (its copy hands over to the layout's store, judged from a click's starting point).
  useEffect(() => {
    const onPop = () => {
      const key = intentTarget(lastPath.current ?? '', window.location.pathname);
      if (key && !HANDOVER.has(key)) openCopy(key, `${window.location.pathname}${window.location.search}`);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // a new RSC payload for the layout (router.refresh, a server action): the visible copy reads its props again
  const firstChildren = useRef(true);
  useEffect(() => {
    if (firstChildren.current) {
      firstChildren.current = false;
      return;
    }
    const active = getRegistry().active;
    if (active) quietRefresh(active);
  }, [children]);

  // the handover screen's route landed: its fresh props are worth keeping for the next visit
  useEffect(() => {
    const active = getRegistry().active;
    if (landed && active) quietRefresh(active);
  }, [landed]);

  // warm-up: each screen read once, one after the other, when the browser is idle
  useEffect(() => {
    let stop = false;
    let cancel = () => {};
    const next = (i: number) => {
      const key = ARM_SAMPLE_KEYS[i];
      if (stop || !key) return;
      if (getRegistry().entries[key].hasProps) return next(i + 1);
      cancel = idle(() => void refresh(key, searchFor(key)).finally(() => next(i + 1)));
    };
    next(0);
    return () => {
      stop = true;
      cancel();
    };
  }, []);
}
