'use client';

import { createContext, useContext } from 'react';

/** What the persistent frame shares with the Window inside it: the sidebar's open state and where screen sections mount. */
export interface Frame {
  sideOpen: boolean;
  setSideOpen: (open: boolean) => void;
  /** The node inside the frame's Sidebar that a screen's `sidebar` sections portal into; null until the frame has mounted. */
  slot: HTMLElement | null;
  /**
   * The sidebar's level: 1 is the app menu, 2 the screen in front's own sections (with a way back). It is 2 only while a
   * screen has sections in the slot; a screen that registers them (on showing) brings the sidebar to its level.
   */
  level: 1 | 2;
  setLevel: (level: 1 | 2) => void;
  /** Whether the screen in front has sections of its own: the second level has something to show. */
  nested: boolean;
  /** A Window with `sidebar` sections calls this while it is shown; the result is its cleanup. */
  registerNested: () => () => void;
}

/**
 * Set by AppFrame. Null outside one (tests, a Window rendered on its own): the Window then draws its own frame. A screen
 * never reads this; Window does.
 */
export const FrameContext = createContext<Frame | null>(null);

export function useFrame(): Frame | null {
  return useContext(FrameContext);
}
