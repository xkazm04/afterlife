'use client';

// Arm A: the real Next routes, made instant. The sidebar rows stay plain <Link>s and production renders the children as
// they are (its <Link>s prefetch each module's shell, so its loading skeleton paints on the click). `next dev` prefetches
// nothing, so there a warmer beside the children compiles the sample modules ahead of the first click (DevWarmer), and
// PendingSkeleton paints the clicked module's skeleton in the click's frame until the route commits. Next keeps the last
// 3 routes alive in <Activity>, a fixed limit (next/dist/client/components/bfcache-state-manager.js MAX_BF_CACHE_ENTRIES =
// 3 with cacheComponents, no config), which holds exactly the 3 sample modules at the (app) layout's level.
import { createElement, Fragment, Suspense, type ReactNode } from 'react';
import type { SidebarNav } from '../types';
import { DevWarmer } from './DevWarmer';
import { PendingSkeleton } from './PendingSkeleton';

export function useSidebarNav(href: string): SidebarNav {
  void href;
  return {};
}

export function ArmHost({ children }: { children?: ReactNode }): ReactNode {
  if (process.env.NODE_ENV !== 'development') return children;
  // both read the pathname (request data under cacheComponents): each behind its own Suspense, never above the children.
  // The skeleton comes after the children so it draws over the old screen in the same grid cell.
  return createElement(
    Fragment,
    null,
    createElement(Suspense, { fallback: null }, createElement(DevWarmer)),
    children,
    createElement(Suspense, { fallback: null }, createElement(PendingSkeleton)),
  );
}
