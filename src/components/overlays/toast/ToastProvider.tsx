'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastApi } from './useToast';
import styles from './Toast.module.css';

const TOAST_MS = 2600;
const STATUS_MS = 4000;

/** Provides useToast(): the floating toast and the status-bar message. Mount once near the root. */
export function ToastProvider({ children }: { children: ReactNode }) {
  // `id` bumps on every toast() so the text lands in a fresh node: an identical string would otherwise change nothing in the live region.
  const [shown, setShown] = useState({ message: '', id: 0 });
  const [statusMessage, setStatusMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(statusTimer.current);
    },
    [],
  );

  const toast = useCallback((m: string) => {
    setShown((s) => ({ message: m, id: s.id + 1 }));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShown((s) => ({ message: '', id: s.id })), TOAST_MS);
  }, []);
  const status = useCallback((m: string) => {
    setStatusMessage(m);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatusMessage(''), STATUS_MS);
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast, status, statusMessage }), [toast, status, statusMessage]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* the live region stays mounted: one inserted together with its text is often not announced */}
      <div className={shown.message ? styles.toast : undefined} role="status" aria-live="polite">
        <span key={shown.id}>{shown.message}</span>
      </div>
    </ToastContext.Provider>
  );
}
