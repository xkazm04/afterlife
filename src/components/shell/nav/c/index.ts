'use client';

// Arm C (hybrid registry): a sidebar click reveals a client copy of the target screen in the same frame (last-known props,
// or its skeleton on a first visit) while the Link's own navigation runs underneath in a transition, so the URL and the
// real route stay the source of truth. Fleet and Monitor keep their copy visible over the hidden route (state kept across
// tabs); Needs you's copy hands over to its route once it lands (the outbox lives in the route's layout). See model/.
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';
import type { SidebarNav } from '../types';
import { intentTarget } from './model/registryRules';
import { openCopy } from './registry';

export { HostC as ArmHost } from './HostC';

export function useSidebarNav(href: string): SidebarNav {
  const pathname = usePathname();
  return {
    // never preventDefault: the Link navigates (router push in a transition) and the copy covers the wait
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const key = intentTarget(pathname, href);
      if (key) openCopy(key, href);
    },
  };
}
