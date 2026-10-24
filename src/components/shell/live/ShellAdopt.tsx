'use client';

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { PENDING_SHELL, type ShellInfo } from '../ShellContext';

const Adopt = createContext<(info: ShellInfo) => void>(() => undefined);

/**
 * The root layout's shell value: PENDING_SHELL in the static shell, then whatever the request-time read (ShellRead,
 * streamed in through `read`) hands ShellAdopt. Each new read (a refresh() re-renders the layout) is adopted again.
 */
export function AdoptedShell({ read, children }: { read: ReactNode; children: (info: ShellInfo) => ReactNode }) {
  const [info, setInfo] = useState<ShellInfo>(PENDING_SHELL);
  return (
    <Adopt.Provider value={setInfo}>
      {read}
      {children(info)}
    </Adopt.Provider>
  );
}

/** Hands one server read to the AdoptedShell above it, before paint. Draws nothing. */
export function ShellAdopt({ info }: { info: ShellInfo }) {
  const adopt = useContext(Adopt);
  useLayoutEffect(() => adopt(info), [adopt, info]);
  return null;
}
