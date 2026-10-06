'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { usePopover } from '@/components/overlays/popover/usePopover';

type Kind = 'help' | 'policy';
/** A press that closed a popover is followed by the click that would reopen it; ignore that click. */
const REOPEN_GUARD_MS = 400;

/**
 * The two sticky popovers (keys and legend, policy rules) on one shared popover: opening one replaces the other, a
 * second press on the same anchor closes it, Escape and an outside press close it.
 */
export function useLadderPopovers() {
  const pop = usePopover();
  const open = useRef<Kind | null>(null);
  const closed = useRef<{ kind: Kind; at: number } | null>(null);
  const wasSticky = useRef(false);

  useEffect(() => {
    if (wasSticky.current && !pop.isSticky && open.current) {
      closed.current = { kind: open.current, at: performance.now() };
      open.current = null;
    }
    wasSticky.current = pop.isSticky;
  }, [pop.isSticky]);

  const toggle = useCallback(
    (kind: Kind, anchor: Element, content: ReactNode, placement: 'above' | 'below', fromPointer: boolean) => {
      if (pop.isSticky && open.current === kind) {
        pop.close();
        return;
      }
      const c = closed.current;
      if (fromPointer && c && c.kind === kind && performance.now() - c.at < REOPEN_GUARD_MS) return;
      open.current = kind;
      pop.show(anchor, content, { sticky: true, placement });
    },
    [pop],
  );

  return { popover: pop.popover, close: pop.close, isOpen: pop.isSticky, toggle };
}
