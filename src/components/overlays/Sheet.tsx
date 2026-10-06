'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Sheet.module.css';

/**
 * A modal sheet that drops from the top of the content pane (it is positioned inside the nearest positioned
 * ancestor: render it as a child of the Window's content). A veil covers the pane; clicking it or pressing
 * Escape calls `onClose`. `footer` holds the buttons; show the exact commands in the body before anything runs.
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
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <>
      <div className={styles.veil} onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={styles.sheet} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} tabIndex={-1}>
        <div className={styles.sh}>
          <h2>{title}</h2>
          {subtitle ? <div className={styles.sub}>{subtitle}</div> : null}
        </div>
        <div className={styles.sb}>{children}</div>
        {footer ? <div className={styles.sf}>{footer}</div> : null}
      </div>
    </>
  );
}
