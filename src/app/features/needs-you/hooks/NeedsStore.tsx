'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { NeedsYouDemo } from '../data/types';
import type { Action, NeedsState } from '../model/types';
import { ClockProvider } from './ClockProvider';
import { useNeedsYou } from './useNeedsYou';

interface Store {
  s: NeedsState;
  dispatch: (a: Action) => void;
  /** The desk as read (null: not read yet). */
  demo: NeedsYouDemo | null;
  /** A screen's view slice landed with the desk: merge it in (the same desk again changes nothing). */
  arrive: (demo: NeedsYouDemo) => void;
}

const StoreContext = createContext<Store | null>(null);

const same = (a: NeedsYouDemo, b: NeedsYouDemo): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * The desk's state, hoisted into the screen host (ScreenDef.Session of the list and a decision's page) so both share it:
 * a write staged on a page is in the list's outbox when it opens, both ways. It lives while either screen is kept, and
 * so does the CRA clock's one tick source: the clock started once, not again each time the list or a page mounts. Each
 * screen hands it the desk it read (`arrive`); `demo` seeds it outside the host (a test).
 */
export function NeedsStore({ demo: initial = null, children }: { demo?: NeedsYouDemo | null; children: ReactNode }) {
  const [demo, setDemo] = useState<NeedsYouDemo | null>(initial);
  const { s, dispatch } = useNeedsYou(demo);
  const arrive = useCallback((next: NeedsYouDemo) => setDemo((prev) => (prev && same(prev, next) ? prev : next)), []);
  const store = useMemo(() => ({ s, dispatch, demo, arrive }), [s, dispatch, demo, arrive]);
  return (
    <StoreContext.Provider value={store}>
      <ClockProvider>{children}</ClockProvider>
    </StoreContext.Provider>
  );
}

/** The host's Session for Needs you: the store with nothing read yet. */
export function NeedsSession({ children }: { children: ReactNode }) {
  return <NeedsStore>{children}</NeedsStore>;
}

export function useNeedsStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useNeedsStore needs NeedsStore above it (the screen host mounts it: screen/host.tsx)');
  return store;
}
