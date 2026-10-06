'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Popover } from './Popover';
import type { Box } from '../position';

interface Shown {
  anchor: Box;
  content: ReactNode;
  sticky: boolean;
  placement: 'below' | 'above';
}

export interface PopoverApi {
  /** Render this in your component (it portals to <body> when shown). */
  popover: ReactNode;
  isOpen: boolean;
  isSticky: boolean;
  /**
   * Show `content` next to `anchor`. `delay` waits `delayMs` first (hover tooltips). `sticky` keeps it until
   * Escape or an outside press (legends); a non-sticky one goes away on hide().
   */
  show: (anchor: Element, content: ReactNode, opts?: { sticky?: boolean; delay?: boolean; placement?: 'below' | 'above' }) => void;
  /** Hides a non-sticky popover (call from mouseleave). A sticky one stays. */
  hide: () => void;
  /** Sticky open/close from one button. */
  toggle: (anchor: Element, content: ReactNode, placement?: 'below' | 'above') => void;
  close: () => void;
}

const toBox = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};

/** Popover state in one hook. `delayMs` is the hover delay used by show(..., { delay: true }). */
export function usePopover(delayMs = 380): PopoverApi {
  const [shown, setShown] = useState<Shown | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stickyRef = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const close = useCallback(() => {
    clearTimeout(timer.current);
    stickyRef.current = false;
    setShown(null);
  }, []);

  const show = useCallback<PopoverApi['show']>(
    (anchor, content, opts = {}) => {
      clearTimeout(timer.current);
      if (stickyRef.current && !opts.sticky) return;
      const box = toBox(anchor);
      const next: Shown = { anchor: box, content, sticky: !!opts.sticky, placement: opts.placement ?? 'below' };
      const go = () => {
        stickyRef.current = next.sticky;
        setShown(next);
      };
      if (opts.delay) timer.current = setTimeout(go, delayMs);
      else go();
    },
    [delayMs],
  );

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    if (!stickyRef.current) setShown(null);
  }, []);

  const toggle = useCallback<PopoverApi['toggle']>(
    (anchor, content, placement = 'above') => {
      if (stickyRef.current) close();
      else show(anchor, content, { sticky: true, placement });
    },
    [close, show],
  );

  const popover = shown ? (
    <Popover anchor={shown.anchor} placement={shown.placement} onClose={shown.sticky ? close : undefined}>
      {shown.content}
    </Popover>
  ) : null;

  return { popover, isOpen: shown !== null, isSticky: shown?.sticky ?? false, show, hide, toggle, close };
}
