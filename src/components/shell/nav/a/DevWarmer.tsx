'use client';

import { usePathname } from 'next/navigation';
import { useActivationRefresh } from './useActivationRefresh';
import { useClickPending, useDevWarm } from './useDevWarm';

/** Arm A's dev-only effects, mounted beside the (app) layout's children: it renders nothing. */
export function DevWarmer(): null {
  const pathname = usePathname();
  useDevWarm();
  useClickPending();
  useActivationRefresh(pathname);
  return null;
}
