'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastApi } from './useToast';
import styles from './Toast.module.css';

const TOAST_MS = 2600;
const STATUS_MS = 4000;

/** Provides useToast(): the floating toast and the status-bar message. Mount once near the root. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
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
    setMessage(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(''), TOAST_MS);
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
      {message ? (
        <div className={styles.toast} role="status">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
