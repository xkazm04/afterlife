'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { NeedsYouDemo } from '../data/types';
import type { Action, NeedsState } from '../model/types';
import { useNeedsYou } from './useNeedsYou';

interface Store {
  s: NeedsState;
  dispatch: (a: Action) => void;
}

const StoreContext = createContext<Store | null>(null);

/**
 * The desk's state, held by the /needs-you layout so the list and a decision's page share it: a write staged on the page
 * is in the list's outbox when it opens. It lives as long as the viewer stays under /needs-you.
 */
export function NeedsStore({ demo, children }: { demo: NeedsYouDemo; children: ReactNode }) {
  const store = useNeedsYou(demo);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useNeedsStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useNeedsStore needs the /needs-you layout above it');
  return store;
}
