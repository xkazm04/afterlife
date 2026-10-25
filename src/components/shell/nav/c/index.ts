'use client';

// Arm C (a client copy swaps in while the real route loads underneath). Stub: today's plain Link and no host. Package C replaces this folder's contents.
import type { ReactNode } from 'react';
import type { SidebarNav } from '../types';

export function useSidebarNav(href: string): SidebarNav {
  void href;
  return {};
}

export function ArmHost({ children }: { children?: ReactNode }): ReactNode {
  return children;
}
