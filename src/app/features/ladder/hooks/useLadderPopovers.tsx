'use client';

import { useCallback, useRef, type ReactNode } from 'react';
import { usePopover } from '@/components/overlays/popover/usePopover';

type Kind = 'help' | 'policy';

/**
 * The two sticky popovers (keys and legend, policy rules) on one shared popover: opening one replaces the other, a
 * second press on the same anchor closes it, Escape and an outside press close it.
 */
export function useLadderPopovers() {
  const pop = usePopover();
  const open = useRef<Kind | null>(null);

  const toggle = useCallback(
    (kind: Kind, anchor: Element, content: ReactNode, placement: 'above' | 'below') => {
      if (pop.isSticky && open.current === kind) {
        pop.close();
        return;
      }
      open.current = kind;
      pop.show(anchor, content, { sticky: true, placement });
    },
    [pop],
  );

  return { popover: pop.popover, close: pop.close, isOpen: pop.isSticky, toggle };
}
