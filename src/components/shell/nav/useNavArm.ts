'use client';

import { useSyncExternalStore } from 'react';
import { NAV_ARM_KEY, parseArm, type NavArm } from './navArm';

/** Written beside localStorage so server code may read the arm (no server code reads it yet). Dev only, like the arm. */
export const ARM_COOKIE = 'belay-arm';

const listeners = new Set<() => void>();

function readStored(): NavArm | null {
  try {
    return parseArm(window.localStorage.getItem(NAV_ARM_KEY));
  } catch {
    return null; // storage blocked (private window, a test): the URL or the default decides
  }
}

function persist(arm: NavArm): void {
  try {
    if (window.localStorage.getItem(NAV_ARM_KEY) !== arm) window.localStorage.setItem(NAV_ARM_KEY, arm);
  } catch {
    // storage blocked: the arm lasts as long as ?arm= stays in the URL
  }
  try {
    if (!document.cookie.split('; ').includes(`${ARM_COOKIE}=${arm}`)) document.cookie = `${ARM_COOKIE}=${arm}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // no cookie jar: nothing reads it yet
  }
}

/** ?arm= (remembered) > the remembered arm > A. Outside `next dev` always A: the bake-off never reaches production. */
export function readNavArm(): NavArm {
  if (process.env.NODE_ENV !== 'development') return 'A';
  const fromUrl = parseArm(new URLSearchParams(window.location.search).get('arm'));
  const arm = fromUrl ?? readStored() ?? 'A';
  if (fromUrl) persist(fromUrl);
  return arm;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  window.addEventListener('popstate', fn);
  window.addEventListener('storage', fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('popstate', fn);
    window.removeEventListener('storage', fn);
  };
}

/** The bake-off arm this browser runs. 'A' on the server and during hydration, then the browser's own. */
export function useNavArm(): NavArm {
  return useSyncExternalStore(subscribe, readNavArm, () => 'A');
}

/** Re-read the arm everywhere (after a pushState that changed ?arm=, which fires no event). */
export function notifyNavArm(): void {
  for (const fn of listeners) fn();
}
