'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useShellSync } from './live/useShellSync';

/** What the status bar needs to say about the data the screens show. Plain values: it crosses from server to client. */
export interface ShellData {
  mode: 'demo' | 'live';
  /** Live mode on the seeded fake GitLab (BELAY_GITLAB=fake): not a real group. */
  fakeGitlab: boolean;
  /** The group being watched; 'not paired' when there is none. */
  group: string;
  /** The source declares parts that are still the demo's narrative beside the live data. */
  illustrative: boolean;
}

export interface ShellInfo {
  /** Decisions waiting for the operator: the badge on the "Needs you" nav item. */
  needsYouCount: number;
  data: ShellData;
}

/** Without a provider the shell is the demo: tests and the kit render that way. */
export const DEMO_SHELL: ShellInfo = {
  needsYouCount: 0,
  data: { mode: 'demo', fakeGitlab: false, group: 'not paired', illustrative: false },
};

const ShellContext = createContext<ShellInfo>(DEMO_SHELL);

/**
 * The root layout reads the data source on the server and passes the numbers and the mode the chrome needs. With `sync`
 * (the app's Providers) the client re-reads them on navigation and focus (live/useShellSync.ts); without it (tests, the
 * kit) the value is static and nothing is fetched.
 */
export function ShellProvider({ value, sync = false, children }: { value: ShellInfo; sync?: boolean; children: ReactNode }) {
  if (sync) return <SyncedShell value={value}>{children}</SyncedShell>;
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

function SyncedShell({ value, children }: { value: ShellInfo; children: ReactNode }) {
  return <ShellContext.Provider value={useShellSync(value)}>{children}</ShellContext.Provider>;
}

export function useShellInfo(): ShellInfo {
  return useContext(ShellContext);
}
