'use client';

import { createContext, useContext } from 'react';

export interface ToastApi {
  /** A transient message at the bottom centre (about 2.6 s). */
  toast: (message: string) => void;
  /** A short message in the status bar (about 4 s), for quiet feedback. */
  status: (message: string) => void;
  /** The current status-bar message ("" when none). The StatusBar shows it. */
  statusMessage: string;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Needs a <ToastProvider> above it (the root layout mounts one). */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast needs a ToastProvider above it');
  return api;
}

/** The status-bar message, or "" when there is no provider (kit gallery, tests). */
export function useStatusMessage(): string {
  return useContext(ToastContext)?.statusMessage ?? '';
}
