'use client';

import { useEffect } from 'react';
import { GatesEntrance } from './gates/GatesEntrance';
import type { EntranceProps } from './types';

/** Set once a page load has shown the entrance: a client-side return to the door from the app skips the ceremony. */
let entered = false;

/** Did this page load already show the entrance? (False on the server and on the server-rendered first load.) */
export const enteredBefore = (): boolean => entered;

/**
 * The landing page's entrance: the treasure gates over the city (the prototype contest's winner, B), server-rendered so
 * the city never flashes first. Under reduced motion there is no ceremony: the gates hide in CSS, and the harness opens
 * and finishes at once.
 */
export function Entrance({ onOpen, onDone }: EntranceProps) {
  useEffect(() => {
    entered = true;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    onOpen();
    onDone();
  }, [onOpen, onDone]);
  return <GatesEntrance onOpen={onOpen} onDone={onDone} />;
}
