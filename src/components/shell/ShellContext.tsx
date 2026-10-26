'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Estate } from '@/lib/settings/demoEstate';
import { useShellSync } from './live/useShellSync';

/**
 * The poller's health as the server last read it (the snapshot's, by the source's own clock) and the interval it polls
 * at: the status bar's poll line (bars/poll/pollLine.ts). The client adds only the time since it received this.
 */
export interface ShellPoll {
  /** Seconds since the last cycle that read the group; null: none ever did. */
  ageSec: number | null;
  /** Why the last cycle could not read the group; null: it could. */
  error: string | null;
  /** Polled projects whose last poll failed, of all the polled projects. */
  failing: number;
  of: number;
  /** AFTERLIFE_POLL_SECONDS: how often the poller runs. */
  intervalSec: number;
}

/** What the status bar needs to say about the data the screens show. Plain values: it crosses from server to client. */
export interface ShellData {
  mode: 'demo' | 'live';
  /** Live mode on the seeded fake GitLab (AFTERLIFE_GITLAB=fake): not a real group. */
  fakeGitlab: boolean;
  /** The group being watched; 'not paired' when there is none. */
  group: string;
  /** The source declares parts that are still the demo's narrative beside the live data. */
  illustrative: boolean;
  /** Live: the poll's health. Demo: null, nothing is polled. */
  poll: ShellPoll | null;
}

/** A project as the command palette needs it: read apart from the shell (GET /api/shell/projects) when the palette opens. */
export interface ShellProject {
  id: string;
  name: string;
  group: string;
  state: string;
}

export interface ShellInfo {
  /** Decisions waiting for the operator: the badge on the "Needs you" nav item. Null: not read yet (no badge, never 0). */
  needsYouCount: number | null;
  /** Null: not read yet; the status bar says the data is unknown, never demo. */
  data: ShellData | null;
  /** The demo-estate setting and the real projects saved (live/estateRead.ts). Absent: not read, every screen shows. */
  estate?: Estate;
}

/** A server read of the shell (readShellInfo, GET /api/shell): every value known. */
export interface KnownShellInfo extends ShellInfo {
  needsYouCount: number;
  data: ShellData;
}

/** Without a provider the shell is the demo: tests and the kit render that way. */
export const DEMO_SHELL: KnownShellInfo = {
  needsYouCount: 0,
  data: { mode: 'demo', fakeGitlab: false, group: 'not paired', illustrative: false, poll: null },
};

/**
 * The shell before its request-time read has streamed in (the root layout's static shell): every value unknown, never the
 * demo's and never a zero count. The read (live/ShellRead.tsx) replaces it.
 */
export const PENDING_SHELL: ShellInfo = { needsYouCount: null, data: null };

const ShellContext = createContext<ShellInfo>(DEMO_SHELL);

/**
 * The root layout reads the data source on the server and passes the numbers and the mode the chrome needs. With `sync`
 * (the app's Providers) the client re-reads them on regained focus (live/useShellSync.ts); without it (tests, the
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
