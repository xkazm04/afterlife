'use client';

// Arm A (real Next routes made instant). Stub: today's plain Link and no host. Package A replaces this folder's contents.
import type { ReactNode } from 'react';
import type { SidebarNav } from '../types';

export function useSidebarNav(href: string): SidebarNav {
  void href;
  return {};
}

export function ArmHost({ children }: { children?: ReactNode }): ReactNode {
  return children;
}
