'use client';

// How a Setup screen hands its slices to the Setup session. The session is the screen host's Session, mounted outside
// any screen's scope, so it cannot read slices itself: each Frame reads the four (catalogue, tracks, doctor, steps) and
// feeds every arrival in. The session drops an arrival it has already applied (a screen shown again), so feeding is
// safe from both screens and on every render.
import { createContext, useContext, useEffect } from 'react';
import { useSlice, type SliceState } from '@/components/shell/host';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { useSetupMaybe } from '../SetupContext';

export type SetupPart = 'catalogue' | 'tracks' | 'doctor' | 'steps';
export type SetupFeed = (part: SetupPart, slice: SliceState<unknown>) => void;

/** The slices, in the order the server streams them (screen/slices.ts and screen/host.tsx). */
export const SETUP_SLICES: readonly SetupPart[] = ['catalogue', 'tracks', 'doctor', 'steps'];

export const SetupFeedContext = createContext<SetupFeed | null>(null);

/** Feed this screen's slices to the session, in stream order. Esc clears the map's hover and filter while it shows. */
export function useSetupFeed(): void {
  const feed = useContext(SetupFeedContext);
  const catalogue = useSlice<unknown>('catalogue');
  const tracks = useSlice<unknown>('tracks');
  const doctor = useSlice<unknown>('doctor');
  const steps = useSlice<unknown>('steps');
  useEffect(() => {
    if (!feed) return;
    feed('catalogue', catalogue);
    feed('tracks', tracks);
    feed('doctor', doctor);
    feed('steps', steps);
  }, [feed, catalogue, tracks, doctor, steps]);
  const api = useSetupMaybe();
  const clear = api?.view.clear;
  useHotkeys(clear ? [{ key: 'Escape', handler: clear, preventDefault: false }] : []);
}
