'use client';

// The Ladder session (ScreenDef.Session for 'ladder' and 'ladder/[class]'): ONE ladder store for the list and every class
// page, so a revoke sent on a class page is the same move on the list (the demo's simulated one too), and a send's
// answer lands here even after its screen left. Each screen hands it its slices as they land (screen/host.tsx).
import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { EMPTY_STORE, seedOf, storeReducer, type CoreSeed, type LadderStore, type LedgerPart, type StoreAction } from '../model/session/store';
import type { LadderSeed } from '../model/state/state';
import type { LadderScreenProps } from '../props';

/** The core slice: everything the screens take, the seed without its ledger. */
export type LadderCore = Omit<LadderScreenProps, 'seed'> & { seed: CoreSeed };

export interface LadderSessionValue {
  store: LadderStore;
  dispatch: Dispatch<StoreAction>;
  /** The latest core read (null: not read yet). */
  core: LadderCore | null;
  /** Both reads as one seed (an unread ledger is empty): what a reset and the receipts read. */
  seed: LadderSeed;
  arriveCore: (core: LadderCore) => void;
  arriveLedger: (ledger: LedgerPart) => void;
}

const Ctx = createContext<LadderSessionValue | null>(null);

const same = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

export function LadderSession({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(storeReducer, EMPTY_STORE);
  const [core, setCore] = useState<LadderCore | null>(null);
  // the screens' reads, by value: the list and a class page each read their own copy, the same text arrives once
  const last = useRef<{ core: LadderCore | null; ledger: LedgerPart | null }>({ core: null, ledger: null });
  const arriveCore = useCallback((next: LadderCore) => {
    const prev = last.current.core;
    if (prev && same(prev, next)) return;
    last.current.core = next;
    setCore(next);
    if (!prev || !same(prev.seed, next.seed)) dispatch({ type: 'arriveCore', core: next.seed });
  }, []);
  const arriveLedger = useCallback((next: LedgerPart) => {
    if (last.current.ledger && same(last.current.ledger, next)) return;
    last.current.ledger = next;
    dispatch({ type: 'arriveLedger', ledger: next });
  }, []);
  const seed = useMemo(() => seedOf(store.core, store.ledger), [store.core, store.ledger]);
  const value = useMemo(() => ({ store, dispatch, core, seed, arriveCore, arriveLedger }), [store, core, seed, arriveCore, arriveLedger]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The session the screen is in; null outside the host (a test, the kit): the screen then keeps its own store. */
export function useLadderSession(): LadderSessionValue | null {
  return useContext(Ctx);
}
