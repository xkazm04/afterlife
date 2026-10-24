'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { NeedsYouDemo } from '../data/types';
import type { Action, NeedsState } from '../model/types';
import { ClockProvider } from './ClockProvider';
import { useNeedsYou } from './useNeedsYou';

interface Store {
  s: NeedsState;
  dispatch: (a: Action) => void;
}

const StoreContext = createContext<Store | null>(null);

/**
 * The desk's state, held by the /needs-you layout so the list and a decision's page share it: a write staged on the page
 * is in the list's outbox when it opens. It lives as long as the viewer stays under /needs-you, and so does the CRA clock's
 * one tick source: the clock started once, not again each time the list or a decision's page mounts.
 */
export function NeedsStore({ demo, children }: { demo: NeedsYouDemo; children: ReactNode }) {
  const store = useNeedsYou(demo);
  return (
    <StoreContext.Provider value={store}>
      <ClockProvider>{children}</ClockProvider>
    </StoreContext.Provider>
  );
}

export function useNeedsStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useNeedsStore needs the /needs-you layout above it');
  return store;
}
