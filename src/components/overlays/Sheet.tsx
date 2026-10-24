'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { TABBABLE, trapTarget } from '@/lib/keyboard/focusTrap';
import { onEscape } from './escapeLayers';
import styles from './Sheet.module.css';

/**
 * A modal sheet that drops from the top of the content pane (it is positioned inside the nearest positioned
 * ancestor: render it as a child of the Window's content). A veil covers the pane; clicking it or pressing
 * Escape calls `onClose`. Tab stays inside it, and closing hands focus back to the opener. `footer` holds the buttons;
 * show the exact commands in the body before anything runs.
 */
export function Sheet({
  title,
  subtitle,
  footer,
  onClose,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Callers pass a fresh onClose every render; the effect below must not depend on it (see Sheet.test.ts).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus({ preventScroll: true });
    const off = onEscape(() => closeRef.current());
    return () => {
      off();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  // aria-modal promises focus stays here: Tab wraps at both ends instead of reaching the pane under the veil.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const self = ref.current;
    if (e.key !== 'Tab' || !self) return;
    const items = [...self.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => el.getClientRects().length > 0);
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = trapTarget(items, active, e.shiftKey, self);
    if (!target) return;
    e.preventDefault();
    target.focus();
  };

  return (
    <>
      <div className={styles.veil} onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className={styles.sh}>
          <h2 id={titleId}>{title}</h2>
          {subtitle ? <div className={styles.sub}>{subtitle}</div> : null}
        </div>
        <div className={styles.sb}>{children}</div>
        {footer ? <div className={styles.sf}>{footer}</div> : null}
      </div>
    </>
  );
}
