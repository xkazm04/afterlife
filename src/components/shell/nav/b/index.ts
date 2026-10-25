'use client';

// Arm B (a client host renders the sample screens from /api/screen JSON). Stub: today's plain Link and no host. Package B replaces this folder's contents.
import type { ReactNode } from 'react';
import type { SidebarNav } from '../types';

export function useSidebarNav(href: string): SidebarNav {
  void href;
  return {};
}

export function ArmHost({ children }: { children?: ReactNode }): ReactNode {
  return children;
}
