'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface ShellInfo {
  /** Decisions waiting for the operator: the badge on the "Needs you" nav item. */
  needsYouCount: number;
}

const ShellContext = createContext<ShellInfo>({ needsYouCount: 0 });

/** The root layout reads the demo data on the server and passes the numbers the chrome needs. */
export function ShellProvider({ value, children }: { value: ShellInfo; children: ReactNode }) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShellInfo(): ShellInfo {
  return useContext(ShellContext);
}
