'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { placeNear, type Box } from '../position';
import styles from './Popover.module.css';

export type PopoverCloseCause = 'escape' | 'press';

/**
 * A floating panel next to an anchor (tooltips with structure, legends). Normally used through usePopover().
 * With `onClose` it also closes on Escape (the key is consumed) and on a press outside it. `onClose` is told the
 * cause and, for a press, what was pressed (usePopover uses it to keep the trigger's own click from reopening).
 */
export function Popover({
  anchor,
  placement = 'below',
  onClose,
  label,
  children,
}: {
  anchor: Box;
  placement?: 'below' | 'above';
  onClose?: (cause: PopoverCloseCause, target?: EventTarget | null) => void;
  label?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPos(placeNear(anchor, { w: el.offsetWidth, h: el.offsetHeight }, { w: innerWidth, h: innerHeight }, placement));
  }, [anchor, placement, children]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose('escape');
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose('press', e.target);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className={styles.pop}
      role={onClose ? 'dialog' : 'tooltip'}
      aria-label={label}
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </div>,
    document.body,
  );
}
