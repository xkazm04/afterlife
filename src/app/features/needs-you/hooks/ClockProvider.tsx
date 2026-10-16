'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { CRA } from '../data/cra';
import { secondsLeft } from '../model/clock/clock';
import { useElapsed } from './useElapsed';

const Left = createContext<number>(CRA.remainingSec);

/**
 * The one tick source for the screen: it owns the 1 s state, and only the components that call useLeftSec re-render
 * with it. The band and the table's clock cells share this value, so they always agree to the second.
 */
export function ClockProvider({ children }: { children: ReactNode }) {
  return <Left.Provider value={secondsLeft(CRA.remainingSec, useElapsed())}>{children}</Left.Provider>;
}

/** Seconds left on the CRA clock; the full window when no provider is above (a static render). */
export function useLeftSec(): number {
  return useContext(Left);
}
