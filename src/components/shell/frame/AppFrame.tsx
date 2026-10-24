'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Backdrop } from '../Backdrop';
import { Sidebar } from '../sidebar/Sidebar';
import { FrameContext } from './FrameContext';
import { Motion } from './Motion';
import styles from './AppFrame.module.css';

/**
 * The persistent part of the macOS window: Ghostwire's backdrop, the window box and its sidebar (left column). The `(app)`
 * route group's layout renders it once, so navigating between screens keeps the sidebar mounted and its open state; each
 * screen's Window fills the right column. `sidebar`: sections drawn inline, for a Window rendered on its own (no layout);
 * inside the layout a screen's sections arrive through the slot (FrameContext) instead.
 */
export function AppFrame({ sidebar, children }: { sidebar?: ReactNode; children?: ReactNode }) {
  const [sideOpen, setSideOpen] = useState(true);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const frame = useMemo(() => ({ sideOpen, setSideOpen, slot }), [sideOpen, slot]);
  return (
    <FrameContext value={frame}>
      <Backdrop />
      <Motion enter="frame-enter">
        <div className={`${styles.win} ${sideOpen ? '' : styles.noSide}`}>
          <Sidebar onToggle={() => setSideOpen((v) => !v)}>
            {sidebar}
            <div ref={setSlot} />
          </Sidebar>
          {children}
        </div>
      </Motion>
    </FrameContext>
  );
}
