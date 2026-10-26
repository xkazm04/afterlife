'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Backdrop } from '../Backdrop';
import { Sidebar } from '../sidebar/Sidebar';
import { FrameContext } from './FrameContext';
import { Motion } from './Motion';
import styles from './AppFrame.module.css';

/**
 * The persistent part of the macOS window: Ghostwire's backdrop, the window box and its sidebar (left column). The `(app)`
 * route group's layout renders it once, so navigating between screens keeps the sidebar mounted and its open state; each
 * screen's Window fills the right column. `sidebar`: sections drawn inline, for a Window rendered on its own (no layout);
 * inside the layout a screen's sections arrive through the slot (FrameContext) instead, as the sidebar's second level.
 * `overlay`: drawn over the whole window box (the (app) layout's X-ray and guide), above the sidebar and the screen.
 */
export function AppFrame({ sidebar, overlay, children }: { sidebar?: ReactNode; overlay?: ReactNode; children?: ReactNode }) {
  const [sideOpen, setSideOpen] = useState(true);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  // How many shown windows have sections in the slot (a route kept hidden in <Activity> unregisters with its effects).
  const [nestedCount, setNestedCount] = useState(0);
  const [chosen, setLevel] = useState<1 | 2>(1);
  const registerNested = useCallback(() => {
    setNestedCount((n) => n + 1);
    setLevel(2); // a screen with sections of its own opens on them
    return () => setNestedCount((n) => n - 1);
  }, []);
  const nested = nestedCount > 0;
  const level = nested ? chosen : 1;
  const frame = useMemo(() => ({ sideOpen, setSideOpen, slot, level, setLevel, nested, registerNested }), [sideOpen, slot, level, nested, registerNested]);
  return (
    <FrameContext value={frame}>
      <Backdrop />
      <Motion enter="frame-enter">
        <div className={`${styles.win} ${sideOpen ? '' : styles.noSide}`}>
          <Sidebar onToggle={() => setSideOpen((v) => !v)} extras={sidebar} slotRef={setSlot} />
          {children}
          {overlay}
        </div>
      </Motion>
    </FrameContext>
  );
}
