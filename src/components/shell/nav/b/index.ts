'use client';

// Arm B (a client host renders the sample screens from /api/screen JSON): the sidebar link's click and the host.
import { useMemo } from 'react';
import type { SidebarNav } from '../types';
import { listKeyOf, takesClick } from './model';
import { navigateTo } from './store';

export { ArmHostB as ArmHost } from './ArmHostB';

/**
 * A list screen's link swaps in place (preventDefault, pushState) and never prefetches the route: the host reads JSON.
 * A detail link (/fleet/<id>, /needs-you/<id>) stays the router's.
 */
export function useSidebarNav(href: string): SidebarNav {
  return useMemo<SidebarNav>(() => {
    if (!listKeyOf(href)) return {};
    return {
      prefetch: false,
      onClick: (e) => {
        if (!takesClick(e, href)) return;
        e.preventDefault();
        navigateTo(href);
      },
    };
  }, [href]);
}
