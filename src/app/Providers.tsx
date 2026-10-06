'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { ShellProvider } from '@/components/shell/ShellContext';
import { TextSizeShortcuts } from '@/lib/settings/TextSizeShortcuts';

/** Client providers for the whole app: toasts and status messages, the shell's numbers, the text-size keys. */
export function Providers({ needsYouCount, children }: { needsYouCount: number; children: ReactNode }) {
  return (
    <ToastProvider>
      <ShellProvider value={{ needsYouCount }}>
        <TextSizeShortcuts />
        {children}
      </ShellProvider>
    </ToastProvider>
  );
}
