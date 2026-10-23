'use client';

import { useSyncExternalStore } from 'react';

/** The Cmd/Ctrl cap the `mod` binding (hotkeys.ts: metaKey or ctrlKey) is named by: "⌘" on Apple platforms, "Ctrl+" elsewhere. */
export const MOD_CAP_MAC = '⌘';
export const MOD_CAP_OTHER = 'Ctrl+';

interface NavigatorLike {
  platform?: string;
  userAgentData?: { platform?: string };
}

/** True on macOS, iOS and iPadOS, where the mod key is Command. */
export function isApplePlatform(nav: NavigatorLike | undefined): boolean {
  return /mac|iphone|ipad|ipod/i.test(nav?.userAgentData?.platform || nav?.platform || '');
}

const noSubscribe = () => () => {};

/**
 * The cap in front of a mod chord's key, e.g. `${useModCap()}K`. The server cannot know the platform, so it (and the
 * hydration pass) says "⌘"; the client then reads navigator and re-renders once if it is not an Apple one.
 */
export function useModCap(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => (isApplePlatform(typeof navigator === 'undefined' ? undefined : navigator) ? MOD_CAP_MAC : MOD_CAP_OTHER),
    () => MOD_CAP_MAC,
  );
}
