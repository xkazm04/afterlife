'use client';

import { useSyncExternalStore } from 'react';
import { useShellInfo } from '@/components/shell/ShellContext';

const never = () => () => {};

/**
 * Whether the guide can play: the app shows the demo estate it replays. False while the page hydrates (the server renders
 * the static shell before the data is read), so what depends on it never differs between the server HTML and the client.
 */
export function useDemo(): boolean {
  const { data } = useShellInfo();
  const hydrated = useSyncExternalStore(never, () => true, () => false);
  return hydrated && data?.mode === 'demo';
}
