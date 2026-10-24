'use client';

import { createContext, useContext } from 'react';

/** What the persistent frame shares with the Window inside it: the sidebar's open state and where screen sections mount. */
export interface Frame {
  sideOpen: boolean;
  setSideOpen: (open: boolean) => void;
  /** The node inside the frame's Sidebar that a screen's `sidebar` sections portal into; null until the frame has mounted. */
  slot: HTMLElement | null;
}

/**
 * Set by AppFrame. Null outside one (tests, a Window rendered on its own): the Window then draws its own frame. A screen
 * never reads this; Window does.
 */
export const FrameContext = createContext<Frame | null>(null);

export function useFrame(): Frame | null {
  return useContext(FrameContext);
}
